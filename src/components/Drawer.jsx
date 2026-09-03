import Dialog from './Dialog';

export default function Drawer(props) {
  return <Dialog {...props} className={`drawer ${props.className ?? ''}`.trim()} />;
}
