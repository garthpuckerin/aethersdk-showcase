import { forwardRef } from 'react';

export const Button = forwardRef(function Button(
  { variant = 'primary', className = '', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`button button--${variant} ${className}`.trim()}
      {...props}
    />
  );
});

export function IconButton({ label, children, ...props }) {
  return <Button variant="ghost" aria-label={label} {...props}>{children}</Button>;
}

export function Eyebrow({ children }) {
  return <p className="eyebrow">{children}</p>;
}
