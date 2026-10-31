export default function DashboardLoading() {
  return (
    <main aria-busy="true" className="min-h-screen bg-gray-50 px-6 py-12">
      <span role="status" className="sr-only">Cargando dashboard...</span>
      <div aria-hidden="true" className="mx-auto max-w-4xl carga-animada">
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="mt-4 h-9 w-72 rounded bg-gray-200" />
        <div className="mt-3 h-5 w-96 max-w-full rounded bg-gray-200" />

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="h-6 w-36 rounded bg-gray-200" />
          <div className="mt-5 h-5 w-64 rounded bg-gray-200" />
          <div className="mt-3 h-4 w-full max-w-xl rounded bg-gray-200" />
          <div className="mt-6 h-10 w-36 rounded-lg bg-gray-200" />
        </section>
      </div>
    </main>
  );
}
