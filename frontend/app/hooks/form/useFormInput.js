// hooks/useFormInput.js
import { useState } from 'react';

export const useFormInput = (initialValues = {}) => {
  const [formData, setFormData] = useState(initialValues);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  return { formData, setFormData, error, setError, handleInputChange };
};
