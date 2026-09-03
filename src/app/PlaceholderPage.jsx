export default function PlaceholderPage({ route }) {
  return (
    <section className="page-heading">
      <p className="eyebrow">{route.group}</p>
      <h1>{route.label}</h1>
      <p>This surface is connected to the shared shell. Its canonical projection arrives in the next slice.</p>
    </section>
  );
}
