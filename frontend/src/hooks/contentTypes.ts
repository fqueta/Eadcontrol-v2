import { useGenericApi } from "@/hooks/useGenericApi";
import { contentTypesService, type ContentTypeItem, type CreateContentTypeInput, type UpdateContentTypeInput } from "@/services/contentTypesService";

export function useContentTypesApi() {
  return useGenericApi<ContentTypeItem, CreateContentTypeInput, UpdateContentTypeInput>({
    service: contentTypesService,
    queryKey: "content-types",
    entityName: "Tipo de Conteúdo",
  });
}
