import { useState } from 'react'
import { useLecturerClasses } from './useClasses'

/** Class picker for lecturer pages: the first class is selected until the user picks another one. */
export const useClassSelection = () => {
  const classes = useLecturerClasses()
  const [selectedClassId, setSelectedClassId] = useState('')
  const classId = selectedClassId || classes.data?.[0]?.id || ''
  return { classes, classId, setClassId: setSelectedClassId }
}
