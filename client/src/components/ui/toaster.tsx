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
              backgroundColor: '#ffffff !important',
              color: '#374151 !important',
              border: '2px solid #e5e7eb !important',
              borderRadius: '8px !important',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1) !important',
              padding: '16px !important',
              zIndex: '9999 !important',
              position: 'relative !important',
              minWidth: '300px !important'
            }}
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
          position: 'fixed !important',
          top: '20px !important',
          right: '20px !important',
          zIndex: '9998 !important',
          display: 'flex !important',
          maxHeight: '100vh !important',
          width: 'auto !important',
          flexDirection: 'column !important',
          padding: '0 !important',
          gap: '8px !important'
        }}
      />
    </ToastProvider>
  )
}
