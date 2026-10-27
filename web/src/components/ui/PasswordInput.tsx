import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Input } from './Input';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  invalid?: boolean;
};

/**
 * Kolom password dengan tombol Tampilkan atau Sembunyikan, supaya salah ketik di HP bisa
 * dilihat dan diperbaiki. Tombolnya bisa dijangkau keyboard dan memberi tahu pembaca layar
 * keadaannya lewat `aria-pressed`.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(props, ref) {
    const [terlihat, setTerlihat] = useState(false);
    return (
      <div className="relative">
        <Input ref={ref} type={terlihat ? 'text' : 'password'} className="pr-24" {...props} />
        <button
          type="button"
          aria-pressed={terlihat}
          onClick={() => setTerlihat((nilai) => !nilai)}
          className="absolute top-1/2 right-2 h-8 -translate-y-1/2 rounded-lg px-2.5 text-[13px] font-semibold text-muted transition-colors duration-150 hover:bg-active hover:text-ink focus-visible:outline-2 focus-visible:outline-warga"
        >
          {terlihat ? 'Sembunyikan' : 'Tampilkan'}
        </button>
      </div>
    );
  },
);
