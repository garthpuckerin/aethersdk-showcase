import { createElement } from 'react';
import SharedProviderMark from '../../components/ProviderMark';

export { providerInitials } from '../../demo/providerIcons';

export function ProviderMark(props) {
  return createElement(SharedProviderMark, props);
}
