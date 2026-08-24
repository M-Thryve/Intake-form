import { Icon } from './icons/Icons'

interface Props {
  message?: string
  show: boolean
  variant?: 'warning' | 'error'
}

const VARIANT_STYLES = {
  warning: {
    container: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    icon: 'warning' as const,
  },
  error: {
    container: 'text-red-700 bg-red-50 border-red-200',
    icon: 'x' as const,
  },
}

export default function ValidationWarning({ message, show, variant = 'warning' }: Props) {
  if (!show || !message) return null

  const styles = VARIANT_STYLES[variant]

  return (
    <div role="alert" className={`mt-1 text-sm p-2 rounded border ${styles.container}`}>
      <Icon name={styles.icon} size={16} /> {message}
    </div>
  )
}
