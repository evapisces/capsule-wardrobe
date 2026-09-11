import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCloset } from '../lib/api';
import type { Closet } from '@capsule/shared';

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px' };
const labelStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-tertiary)',
};
const inputStyle: React.CSSProperties = {
  height: '40px', padding: '0 13px', borderRadius: '9px',
  border: '1px solid var(--line-default)', fontSize: '14px', background: '#FFFFFF',
};
const textareaStyle: React.CSSProperties = {
  padding: '10px 13px', borderRadius: '9px', minHeight: '80px', resize: 'vertical',
  border: '1px solid var(--line-default)', fontSize: '14px', background: '#FFFFFF', fontFamily: 'inherit',
};

export default function CreateClosetPrompt() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: () => createCloset({ name, description: description || undefined }),
    onSuccess: (closet) => {
      qc.setQueryData<Closet[]>(['closets'], (prev) => (prev ? [...prev, closet] : [closet]));
      qc.invalidateQueries({ queryKey: ['closets'] });
    },
  });

  return (
    <div
      style={{
        maxWidth: '520px',
        margin: '40px auto',
        padding: '28px',
        borderRadius: '14px',
        border: '1px solid var(--line-strong)',
        background: 'var(--bg-page)',
      }}
    >
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '30px', fontWeight: 400, color: 'var(--ink-primary)', marginBottom: '10px' }}>
        Create your closet
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--ink-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
        A closet holds every item you own — photos, categories, and how often you wear them.
        Give it a name to get started; you can always add items right after.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || mutation.isPending) return;
          mutation.mutate();
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="closet-name">Name *</label>
          <input
            id="closet-name"
            aria-label="Closet name"
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your closet"
            required
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="closet-description">Description</label>
          <textarea
            id="closet-description"
            aria-label="Closet description"
            style={textareaStyle}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes about this closet"
          />
        </div>
        <button
          type="submit"
          className="btn-primary"
          disabled={!name.trim() || mutation.isPending}
        >
          {mutation.isPending ? 'Creating…' : 'Create closet'}
        </button>
        {mutation.isError && (
          <p style={{ color: 'var(--accent-amber)', fontSize: '13px' }}>
            {(mutation.error as Error).message || 'Something went wrong creating your closet. Please try again.'}
          </p>
        )}
      </form>
    </div>
  );
}
