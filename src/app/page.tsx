import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Trophy, Calendar, ChevronRight, LayoutDashboard } from 'lucide-react'

export default async function Home() {
  // Busca apenas partidas com status 'fechada'
  const { data: partidas, error } = await supabase
    .from('partidas')
    .select('id, titulo, data_criacao')
    .eq('status', 'fechada')
    .order('data_criacao', { ascending: false })

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-10">
        
        {/* Header Principal */}
        <header className="text-center py-12">
          <div className="inline-block bg-slate-900 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-[0.2em] mb-4">
            Comunidade Oficial
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter italic">
            Amigos do Thiagão!
          </h1>
          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-2">
            Histórico de Times
          </p>
        </header>

        {/* Lista de Partidas Encerradas */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
            Peladas Finalizadas
          </h3>

          {partidas && partidas.length > 0 ? (
            partidas.map((p) => (
              <Link 
                key={p.id} 
                href={`/votar/${p.id}`}
                className="group block bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all active:scale-[0.98]"
              >
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">
                      {p.titulo}
                    </h2>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                      <Calendar size={14} />
                      {new Date(p.data_criacao).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-blue-600 group-hover:text-white text-slate-300 transition-all">
                    <ChevronRight size={24} />
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
              <Trophy className="mx-auto text-slate-200 mb-4" size={48} />
              <p className="text-slate-400 font-black uppercase text-sm tracking-tight">
                Nenhuma pelada finalizada ainda
              </p>
            </div>
          )}
        </section>

        {/* Rodapé de Acesso */}
        <footer className="text-center pt-10 pb-20">
          <Link 
            href="/adm" 
            className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-all"
          >
            <LayoutDashboard size={14} /> Painel do Organizador
          </Link>
        </footer>
      </div>
    </main>
  )
}