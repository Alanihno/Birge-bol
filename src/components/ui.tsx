import { Mascot } from './mascot/Mascot';
/* localized-copy */
import { tr, useLocale } from '../lib/i18n';
import * as Dialog from '@radix-ui/react-dialog';
import { Children, isValidElement, useRef } from 'react';
import { ArrowLeft, X, ArrowRight, Info, LoaderCircle } from 'lucide-react';
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { Link, useNavigate } from 'react-router-dom';
function buttonText(children:ReactNode):string{return Children.toArray(children).map(node=>typeof node==='string'?node:typeof node==='number'?String(node):isValidElement<{children?:ReactNode}>(node)?buttonText(node.props.children):'').join('');}
export function Button({ children, className = '', variant = 'primary', busy = false, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'coral' | 'danger' | 'destructive' | 'icon';
    busy?: boolean;
}) { useLocale(); const main=/^(Войти|Записаться|Начать бесплатно|Кіру|Жазылу|Тегін бастау)$/.test(buttonText(children).trim());return <button className={`btn ${variant} ${main?'primary-action':''} ${className}`} disabled={disabled || busy} aria-busy={busy || undefined} {...props}>{tr(busy && <LoaderCircle size={17} className="spin" aria-hidden="true"/>)}{tr(children)}</button>; }
export function PageHeading({ eyebrow, title, description, action }: {
    eyebrow?: string;
    title: string;
    description?: string;
    action?: ReactNode;
}) { useLocale(); return <div className="page-heading"><div>{tr(eyebrow && <div className="eyebrow">{tr(eyebrow)}</div>)}<h1>{tr(title)}</h1>{tr(description && <p>{tr(description)}</p>)}</div>{tr(action)}</div>; }
export function Back() { useLocale(); const nav = useNavigate(); return <button className="back" onClick={() => { if (window.history.state?.idx > 0)
    nav(-1);
else
    nav('/find'); }}><ArrowLeft size={17}/>{tr("Назад")}</button>; }
export function Modal({ open, onOpenChange, title, children, className='' }: {
    className?:string;
    open: boolean;
    onOpenChange: (b: boolean) => void;
    title: string;
    children: ReactNode;
}) { useLocale(); const opener = useRef<HTMLElement | null>(null); return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="modal-overlay"/><Dialog.Content className={'modal '+className} onOpenAutoFocus={() => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }} onCloseAutoFocus={event => { event.preventDefault(); if (opener.current?.isConnected)
    opener.current.focus({ preventScroll: true }); }}><div className="modal-head"><Dialog.Title>{tr(title)}</Dialog.Title><Dialog.Close asChild><button className="icon-btn" aria-label={tr("Закрыть")}><X size={20}/></button></Dialog.Close></div><Dialog.Description className="sr-only">{tr(title)}{tr(". Используйте поля ниже.")}</Dialog.Description>{tr(children)}</Dialog.Content></Dialog.Portal></Dialog.Root>; }
export function Notice({ children, tone = 'lilac' }: {
    children: ReactNode;
    tone?: string;
}) { useLocale(); return <div className={`notice ${tone}`}><Info size={18}/><div>{tr(children)}</div></div>; }
export function Empty({ title, description, to, label }: {
    title: string;
    description: string;
    to?: string;
    label?: string;
}) { useLocale(); return <div className="empty"><Mascot state="comforting" size="large"/><h3>{tr(title)}</h3><p>{tr(description)}</p>{tr(to && <Link className="btn primary" to={to}>{tr(label || 'Начать поиск')}<ArrowRight size={16}/></Link>)}</div>; }
export function Loading() { useLocale(); return <div className="loading" role="status"><Mascot state="loading" size="small"/><span>{tr("Загружаем\u2026")}</span><div className="skeleton"/><div className="skeleton"/></div>; }
export function ErrorState({ retry }: {
    retry: () => void;
}) { useLocale(); return <div className="empty" role="alert"><Mascot state="error" size="large"/><h3>{tr("Не удалось загрузить данные")}</h3><p>{tr("Проверьте соединение и попробуйте ещё раз.")}</p><Button onClick={retry}>{tr("Повторить")}</Button></div>; }
