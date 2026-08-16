import clsx from 'clsx';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'default' | 'accent' | 'outline' | 'muted';
};

export function Badge({ className, tone = 'default', ...props }: BadgeProps) {
  return <span className={clsx('badge', `badge-${tone}`, className)} {...props} />;
}
