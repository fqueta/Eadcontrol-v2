import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createGenericService } from '@/services/GenericApiService';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { hydrateBrandingFromPublicApi } from '@/lib/branding';

type EditableOptionTextProps = {
  optionKey: string;
  defaultValue: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  multiline?: boolean;
  maxLength?: number;
};

const optionsService = createGenericService('/options');

export function EditableOptionText({
  optionKey,
  defaultValue,
  as = 'span',
  className,
  multiline = false,
  maxLength = 280,
}: EditableOptionTextProps) {
  const { user } = useAuth();
  const canEdit = useMemo(() => {
    const pid = Number(user?.permission_id ?? 9999);
    return !!user && pid < 3;
  }, [user]);

  const initial = (() => {
    try {
      const v = localStorage.getItem(optionKey);
      return v !== null && v !== undefined && v !== '' ? v : defaultValue;
    } catch {
      return defaultValue;
    }
  })();

  const [value, setValue] = useState<string>(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const onStorage = () => {
      try {
        const v = localStorage.getItem(optionKey);
        if (v !== null && v !== value) setValue(v);
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('branding:updated', onStorage as EventListener);
    // Recheca após possível hidratação inicial
    const t = setTimeout(onStorage, 600);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('branding:updated', onStorage as EventListener);
      clearTimeout(t);
    };
  }, [optionKey, value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current) {
        try {
          (inputRef.current as HTMLInputElement).select();
        } catch {}
      }
    }
  }, [editing]);

  const Tag = as as any;

  const handleOpen = () => {
    if (!canEdit) return;
    setEditing(true);
  };

  const save = async (newVal: string) => {
    const trimmed = newVal.trim().slice(0, maxLength);
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await optionsService.customPost('/all', { [optionKey]: trimmed });
      try {
        localStorage.setItem(optionKey, trimmed);
      } catch {}
      window.dispatchEvent(new Event('storage'));
      try {
        await hydrateBrandingFromPublicApi({ persist: true });
      } catch {}
      setValue(trimmed);
      toast({ title: 'Texto atualizado', description: 'Conteúdo salvo com sucesso.' });
      setEditing(false);
    } catch (e: any) {
      toast({
        title: 'Falha ao salvar',
        description: e?.message || 'Erro na requisição',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    save(e.currentTarget.value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      save((e.target as HTMLInputElement).value);
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  if (!canEdit) {
    return <Tag className={className}>{value || defaultValue}</Tag>;
  }

  return (
    <>
      {!editing ? (
        <Tag
          className={cn(
            'relative cursor-text transition-colors',
            'hover:bg-yellow-50/60 dark:hover:bg-yellow-900/20',
            'outline-0',
            className,
          )}
          onClick={handleOpen}
          title="Clique para editar"
        >
          {value || defaultValue}
        </Tag>
      ) : multiline ? (
        <textarea
          ref={inputRef as any}
          defaultValue={value}
          className={cn(
            'w-full resize-y rounded-md border border-blue-300 p-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary',
            className,
          )}
          disabled={saving}
          maxLength={maxLength}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      ) : (
        <input
          ref={inputRef as any}
          defaultValue={value}
          className={cn(
            'w-full rounded-md border border-blue-300 px-2 py-1',
            'focus:outline-none focus:ring-2 focus:ring-primary',
            className,
          )}
          disabled={saving}
          maxLength={maxLength}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      )}
    </>
  );
}

export default EditableOptionText;
