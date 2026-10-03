import { Button } from '../Button';

export interface PlayPauseControlProps {
  readonly isPlaying: boolean;
  readonly disabled?: boolean;
  readonly onToggle: () => void;
}

/** Single transport button that switches between play and pause. */
export function PlayPauseControl({ isPlaying, disabled = false, onToggle }: PlayPauseControlProps) {
  return (
    <Button
      variant="primary"
      onClick={onToggle}
      disabled={disabled}
      aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
      title={isPlaying ? 'Pause' : 'Play'}
    >
      <span aria-hidden="true">{isPlaying ? '❚❚' : '▶'}</span>
      {isPlaying ? 'Pause' : 'Play'}
    </Button>
  );
}
