import React, { useState, useEffect, useRef } from 'react'

export default function CustomDialogModal({ dialog, onClose }) {
  const [inputValue, setInputValue] = useState(dialog?.defaultValue || '')
  const inputRef = useRef(null)

  useEffect(() => {
    setInputValue(dialog?.defaultValue || '')
  }, [dialog])

  useEffect(() => {
    if (dialog?.type === 'prompt' && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [dialog?.type])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (dialog?.onCancel) dialog.onCancel()
        else onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dialog, onClose])

  if (!dialog) return null

  const isDanger = !!dialog.danger
  const isPrompt = dialog.type === 'prompt'
  const isAlert = dialog.type === 'alert'

  const handleSubmit = (e) => {
    if (e) e.preventDefault()
    if (isPrompt) {
      if (dialog.onConfirm) dialog.onConfirm(inputValue)
    } else {
      if (dialog.onConfirm) dialog.onConfirm()
    }
  }

  const handleCancel = () => {
    if (dialog.onCancel) dialog.onCancel()
    else onClose()
  }

  return (
    <div className="custom-dialog-backdrop" onPointerDown={handleCancel}>
      <div
        className={`custom-dialog-box ${isDanger ? 'is-danger' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="custom-dialog-header">
          {dialog.icon && <span className="custom-dialog-icon">{dialog.icon}</span>}
          <h3 className="custom-dialog-title">{dialog.title || (isDanger ? 'Warning' : 'Confirm')}</h3>
        </div>

        {dialog.message && (
          <div className="custom-dialog-message">
            {dialog.message}
          </div>
        )}

        {isPrompt ? (
          <form onSubmit={handleSubmit} className="custom-dialog-form">
            <input
              ref={inputRef}
              type="text"
              className="custom-dialog-input"
              value={inputValue}
              placeholder={dialog.placeholder || ''}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
            />
            <div className="custom-dialog-actions">
              <button
                type="button"
                className="custom-dialog-btn cancel-btn"
                onClick={handleCancel}
              >
                {dialog.cancelText || 'Cancel'}
              </button>
              <button
                type="submit"
                className={`custom-dialog-btn confirm-btn ${isDanger ? 'is-danger' : ''}`}
              >
                {dialog.confirmText || 'Submit'}
              </button>
            </div>
          </form>
        ) : (
          <div className="custom-dialog-actions">
            {!isAlert && (
              <button
                type="button"
                className="custom-dialog-btn cancel-btn"
                onClick={handleCancel}
              >
                {dialog.cancelText || 'Cancel'}
              </button>
            )}
            <button
              type="button"
              className={`custom-dialog-btn confirm-btn ${isDanger ? 'is-danger' : ''}`}
              onClick={handleSubmit}
              autoFocus
            >
              {dialog.confirmText || (isAlert ? 'OK' : isDanger ? 'Delete' : 'Confirm')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
