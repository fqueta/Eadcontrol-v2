import { useGenericApi } from "@/hooks/useGenericApi";
import { pagesService, type Page, type CreatePageInput, type UpdatePageInput } from "@/services/pagesService";

export function usePagesApi() {
  return useGenericApi<Page, CreatePageInput, UpdatePageInput>({
    service: pagesService,
    queryKey: "pages",
    entityName: "Página",
  });
}
