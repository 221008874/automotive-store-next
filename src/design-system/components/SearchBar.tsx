import { TextField, InputAdornment, IconButton, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ar from '../../i18n/ar';
import { useEffect, useRef, useState } from 'react';

interface SearchBarProps {
  value: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

export function SearchBar({ value, onSearch, placeholder = ar.search, autoFocus = false }: SearchBarProps) {
  const [local, setLocal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => onSearch(local), 300);
    return () => clearTimeout(timer);
  }, [local, onSearch]);

  useEffect(() => { setLocal(value); }, [value]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !isEditable(e.target)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && local) {
      setLocal('');
      onSearch('');
    }
  };

  return (
    <Tooltip title={ar.searchHint} placement="top">
      <TextField
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        slotProps={{
          htmlInput: { ref: inputRef },
          input: {
            endAdornment: local ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => { setLocal(''); onSearch(''); }}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : (
              <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
            ),
          },
        }}
        sx={{ minWidth: 280 }}
      />
    </Tooltip>
  );
}
