import { useState, FormEvent } from 'react';
import './ActionModal.css';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSubmit: (data: Record<string, string>) => Promise<void>;
  fields?: Array<{
    name: string;
    label: string;
    type: string;
    placeholder?: string;
    required?: boolean;
  }>;
}

export default function ActionModal({
  isOpen,
  onClose,
  title,
  onSubmit,
  fields = [],
}: ActionModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSubmit(formData);
      // Close modal after a brief delay to ensure any alerts are shown first
      setTimeout(() => {
        setLoading(false);
        onClose();
        setFormData({});
      }, 200);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An error occurred. Please check if the backend API is running.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {fields.map((field) => (
            <div key={field.name} className="form-field">
              <label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="required">*</span>}
              </label>
              <input
                id={field.name}
                type={field.type}
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                disabled={loading}
              />
            </div>
          ))}

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Processing...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
