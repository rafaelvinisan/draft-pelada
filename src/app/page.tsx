import { supabase } from '@/lib/supabase'

export default async function Home() {
  // Tenta buscar todas as linhas da tabela 'partidas'
  const { data, error } = await supabase.from('partidas').select('*')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold mb-4 text-slate-800">
          Diagnóstico do Sistema
        </h1>

        {error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200 text-left">
            <p className="font-semibold">❌ Falha na conexão:</p>
            <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(error, null, 2)}</pre>
          </div>
        ) : (
          <div className="bg-green-50 text-green-700 p-4 rounded-md border border-green-200">
            <p className="font-semibold text-lg mb-2">✅ Conexão Sucesso Absoluto!</p>
            <p className="text-sm">
              O banco de dados respondeu. Temos <strong>{data?.length}</strong> partidas cadastradas.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}