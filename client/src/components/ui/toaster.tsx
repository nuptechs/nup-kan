import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  console.log("🍞 [TOASTER] Renderizando com", toasts.length, "toasts:", toasts);

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, duration, ...props }) {
        console.log("🍞 [TOASTER] Renderizando toast individual:", { id, title, description, duration });
        return (
          <Toast 
            key={id} 
            duration={duration || 3000} 
            {...props}
            style={{
              backgroundColor: '#ffffff',
              color: '#374151',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              padding: '16px',
              zIndex: 9999,
              position: 'relative' as const,
              minWidth: '300px'
            } as React.CSSProperties}
          >
            <div className="grid gap-1">
              {title && <ToastTitle style={{ fontWeight: 'bold', fontSize: '14px' }}>{title}</ToastTitle>}
              {description && (
                <ToastDescription style={{ fontSize: '13px', marginTop: '4px' }}>{description}</ToastDescription>
              )}
            </div>
            {action}
          </Toast>
        )
      })}
      <ToastViewport 
        style={{
          position: 'fixed' as const,
          top: '20px',
          right: '20px',
          zIndex: 9998,
          display: 'flex',
          maxHeight: '100vh',
          width: 'auto',
          flexDirection: 'column' as const,
          padding: '0',
          gap: '8px'
        } as React.CSSProperties}
      />
    </ToastProvider>
  )
}
