import { useCallback, useState } from 'react';
import { PERSONAS } from '../../access/policy';
import { useDemo } from '../../demo/context';
import { RANGES, selectAuditEvents, selectExceptions, selectOverviewMetrics, selectRunsInRange, selectThroughputSeries, selectVisibleConnectors } from '../../demo/selectors';
import BucketDrawer from './BucketDrawer';
import DenseLayout from './DenseLayout';
import RoomyLayout from './RoomyLayout';
import { firstName, greetingFor, plural } from './format';
import '../../styles/features/overview.css';

const DEFAULT_RANGE = '24h';

function useOverviewData(state, range) {
  return {
    metrics: selectOverviewMetrics(state, undefined, range),
    series: selectThroughputSeries(state, range),
    runs: selectRunsInRange(state, range),
    connectors: selectVisibleConnectors(state),
    audits: selectAuditEvents(state),
    exceptions: selectExceptions(state),
  };
}

function RangeControl({ range, onChange }) {
  return (
    <div className="segmented" role="group" aria-label="Time range">
      {Object.keys(RANGES).map((key) => (
        <button key={key} type="button" aria-pressed={range === key} onClick={() => onChange(key)}>{key}</button>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const { state, now } = useDemo();
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [selectedBucket, setSelectedBucket] = useState(null);
  const closeDrawer = useCallback(() => setSelectedBucket(null), []);
  const data = useOverviewData(state, range);
  const member = state.members[PERSONAS[state.activePersonaId]?.actorId];
  const name = firstName(member?.name) || PERSONAS[state.activePersonaId]?.label;
  const attention = data.exceptions.total;

  return (
    <div className="page-stack overview">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Observe</p>
          <h1>Operational overview</h1>
          <p className="overview-greeting">{greetingFor(now)}, {name}</p>
          <p className="overview-summary">{plural(data.metrics.running.value, 'sync')} running · {attention.toLocaleString()} {attention === 1 ? 'needs' : 'need'} attention</p>
        </div>
        <div className="page-heading__actions">
          <RangeControl range={range} onChange={setRange} />
        </div>
      </section>

      {state.density === 'dense'
        ? <DenseLayout data={data} range={range} />
        : <RoomyLayout data={data} range={range} onSelectBucket={setSelectedBucket} />}

      <BucketDrawer bucket={selectedBucket} range={range} onClose={closeDrawer} />
    </div>
  );
}
