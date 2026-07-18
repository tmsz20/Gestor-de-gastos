import { type ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'balance';
}

export function Card({ children, className = '', variant = 'default' }: CardProps) {
  return (
    <div className={`${styles.card} ${variant === 'balance' ? styles.balance : ''} ${className}`}>
      {children}
    </div>
  );
}
