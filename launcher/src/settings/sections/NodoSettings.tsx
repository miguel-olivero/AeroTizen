import { RemoteControl } from '../components/RemoteControl';
import { useTextInput } from '../../shared/hooks/useTextInput';
import type { SettingsSectionProps } from '../types';

export const NodoSettings = ({ settings, actions }: SettingsSectionProps) => {
  const { focus, ...input } = useTextInput(settings.nodoUrl || '', actions.setNodoUrl);
  return <>
    <h3>Nodo</h3>
    <div class="units">
      <RemoteControl class="pill unit name-pill nodo-url" focusKey="nodo:url" onClick={focus}>
        <span class="port">URL</span>
        <input {...input} type="text" maxLength={256} placeholder="http://nodo.example/api/status"
          aria-label="URL de Nodo" spellcheck={false} />
      </RemoteControl>
    </div>
  </>;
};
