import { UserForm } from "@/components/users/UserForm";

// ...

<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>
        {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
      </DialogTitle>
      <DialogDescription>
        {editingUser ? 'Altere os dados do usuário' : 'Preencha os dados para criar um novo usuário'}
      </DialogDescription>
    </DialogHeader>
    <UserForm
      form={form}
      onSubmit={onSubmit}
      onCancel={handleCloseModal}
      editingUser={editingUser}
      permissions={permissions}
      isLoadingPermissions={isLoadingPermissions}
      handleOnclick={handleOnclick}
    />
  </DialogContent>
</Dialog>