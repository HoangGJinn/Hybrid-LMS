import { useQuery } from '@tanstack/react-query'
import { documentService } from '../api/document.service'
import { documentKeys } from '../api/queryKeys'

/** Documents uploaded to one class. */
export const useDocuments = (classId: string) =>
  useQuery({ queryKey: documentKeys.byClass(classId), queryFn: () => documentService.getDocuments(classId), enabled: classId !== '' })
