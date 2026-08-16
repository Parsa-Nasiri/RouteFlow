import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { useStore } from '@/store/StoreContext'
import { PRIORITIES, TASK_STATUSES, CATEGORIES } from '@/lib/constants'
import type { Category, Priority, Task, TaskStatus } from '@/types'

export interface TaskModalProps {
  open: boolean
  onClose: () => void
  task?: Task | null
  defaultStatus?: TaskStatus
  defaultDate?: string
  defaultGoalId?: string
  onCreated?: (id: string) => void
}

export function TaskModal({
  open,
  onClose,
  task = null,
  defaultStatus = 'today',
  defaultDate,
  defaultGoalId,
  onCreated,
}: TaskModalProps) {
  const { state, dispatch } = useStore()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<TaskStatus>(defaultStatus)
  const [priority, setPriority] = useState<Priority>('medium')
  const [category, setCategory] = useState<Category>('Work')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [goalId, setGoalId] = useState('')
  const [titleError, setTitleError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setNotes(task?.notes ?? '')
    setStatus(task?.status ?? defaultStatus)
    setPriority(task?.priority ?? 'medium')
    setCategory(task?.category ?? 'Work')
    setDueDate(task?.dueDate ?? defaultDate ?? '')
    setDueTime(task?.dueTime ?? '')
    setGoalId(task?.goalId ?? defaultGoalId ?? '')
    setTitleError('')
    setConfirmDelete(false)
  }, [open, task, defaultStatus, defaultDate, defaultGoalId])

  const activeGoals = state.goals.filter((g) => g.status !== 'completed')

  const save = () => {
    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError('Give your task a name')
      return
    }
    const patch = {
      title: trimmed,
      notes: notes.trim() || undefined,
      status,
      priority,
      category,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      goalId: goalId || undefined,
    }
    if (task) {
      dispatch({ type: 'task/update', id: task.id, patch })
      toast.push('Task updated')
    } else {
      dispatch({ type: 'task/add', task: patch })
      toast.push('Task created')
      onCreated?.('created')
    }
    onClose()
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={task ? 'Edit task' : 'New task'}
        description={task ? undefined : 'Capture it now — route it to the right day later.'}
        footer={
          <>
            {task && (
              <Button variant="danger-ghost" onClick={() => setConfirmDelete(true)} className="mr-auto">
                <Trash2 size={15} /> Delete
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              {task ? 'Save changes' : 'Create task'}
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <Field label="Title" error={titleError}>
            <Input
              autoFocus
              value={title}
              invalid={!!titleError}
              placeholder="e.g. Draft the launch announcement"
              onChange={(e) => {
                setTitle(e.target.value)
                if (titleError) setTitleError('')
              }}
            />
          </Field>

          <Field label="Notes" hint="Optional context, links or next steps">
            <Textarea
              value={notes}
              placeholder="Anything future-you will thank you for…"
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                {TASK_STATUSES.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category">
              <Select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Priority">
            <Segmented
              ariaLabel="Priority"
              className="w-full"
              value={priority}
              onChange={setPriority}
              options={PRIORITIES.map((p) => ({
                value: p.name,
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.label}
                  </span>
                ),
              }))}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Due date">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
            <Field label="Due time">
              <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
            </Field>
          </div>

          <Field label="Linked goal" hint="Optional — ties progress back to a goal">
            <Select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
              <option value="">No goal</option>
              {activeGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (task) {
            dispatch({ type: 'task/delete', id: task.id })
            toast.push('Task deleted', 'info')
          }
          onClose()
        }}
        title="Delete this task?"
        message={`“${task?.title}” will be removed permanently. This can’t be undone.`}
        confirmLabel="Delete task"
      />
    </>
  )
}
