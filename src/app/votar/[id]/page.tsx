"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Trophy, Users, Star, CheckCircle2 } from 'lucide-react'

export default function VotacaoPage() {
  const { id } = useParams()
  const [partida, setPartida] = useState<any>(null)
  const [meuNome, setMeuNome] = useState('')
  const [notas, setNotas] = useState<{ [key: string]: number }>({})
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    async function carregarPartida() {
      const { data } = await supabase
        .from('partidas')
        .select('*')
        .eq('id', id)
        .single()
      
      if (data) {
        setPartida(data)
        const initialNotas: any = {}
        data.jogadores.forEach((j: string) => initialNotas[j] = 3.0)
        setNotas(initialNotas)
      }
    }
    carregarPartida()
  }, [id])

  async function enviarVotos() {
    if (!meuNome) return alert("Selecione o seu nome primeiro!")
    setEnviando(true)

    const listaVotos = partida.jogadores
      .filter((nome: string) => nome !== meuNome)
      .map((nome: string) => ({
        partida_id: id,
        avaliador: meuNome,
        avaliado: nome,
        nota: notas[nome],
        atualizado_em: new Date().toISOString()
      }))

    const { error } = await supabase
      .from('votos')
      .upsert(listaVotos, { onConflict: 'partida_id,avaliador,avaliado' })

    if (error) {
      alert("Erro ao enviar: " + error.message)
    } else {
      setSucesso(true)
    }
    setEnviando(false)
  }

  if (!partida) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-pulse font-black text-slate-400 uppercase tracking-widest">Carregando...</div>
    </div>
  )

  // --- TELA DE RESULTADOS (Se a partida estiver fechada) ---
  if (partida.status === 'fechada') {
    return (
      <main className="min-h-screen bg-slate-900 p-4 md:p-8 text-white font-sans">
        <div className="max-w-md mx-auto space-y-8">
          <header className="text-center space-y-2 pt-6">
            <div className="inline-block bg-blue-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-2">
              Times Definidos
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter italic">
              {partida.titulo}
            </h1>
            <p className="text-slate-400 text-sm font-bold">O algoritmo falou. Agora é em campo.</p>
          </header>

          <div className="space-y-6">
            {partida.resultado_times?.times.map((time: any[], idx: number) => (
              <div key={idx} className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl relative overflow-hidden">
                {/* Background Decorativo */}
                <div className="absolute -right-4 -top-4 text-slate-700 opacity-20 transform rotate-12">
                  <Trophy size={100} />
                </div>
                
                <h2 className="text-xl font-black mb-4 flex items-center gap-2 text-blue-400 uppercase italic">
                  <Users size={20} /> Time {idx + 1}
                </h2>
                
                <ul className="space-y-3 relative z-10">
                  {time.map((j: any) => (
                    <li key={j.nome} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                      <span className="font-bold text-slate-200">{j.nome}</span>
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-black text-slate-400">{j.media.toFixed(1)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                
                <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Força Coletiva</span>
                  <span className="text-sm font-black text-blue-500">
                    {(time.reduce((acc, curr) => acc + curr.media, 0) / 5).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <footer className="text-center pb-10">
            <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">
              Gerado pelo Galo Draft • {new Date().toLocaleDateString()}
            </p>
          </footer>
        </div>
      </main>
    )
  }

  // --- TELA DE SUCESSO PÓS-VOTO (Se ainda estiver aberta) ---
  if (sucesso) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="text-center bg-white p-10 rounded-3xl shadow-xl border border-slate-200 max-w-sm">
        <CheckCircle2 size={60} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-slate-900 uppercase">Voto Confirmado!</h2>
        <p className="text-slate-500 mt-2 font-bold text-sm">Boa, {meuNome}! Assim que o Thiagão fechar a lista, os times aparecerão neste mesmo link.</p>
      </div>
    </div>
  )

  // --- TELA DE VOTAÇÃO ---
  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-28">
      <div className="max-w-md mx-auto">
        <header className="mb-8 pt-6 text-center">
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{partida.titulo}</h1>
          <p className="text-slate-500 text-sm font-bold mt-1 uppercase tracking-widest">Escala de 1.0 a 5.0</p>
        </header>

        <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 mb-6">
          <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-slate-400">Identifique-se</label>
          <select 
            className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-slate-900 font-black outline-none focus:border-blue-500 appearance-none"
            value={meuNome}
            onChange={(e) => setMeuNome(e.target.value)}
          >
            <option value="">QUEM É VOCÊ?</option>
            {partida.jogadores.map((nome: string) => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
        </section>

        {meuNome && (
          <div className="space-y-4">
            {partida.jogadores.filter((n: string) => n !== meuNome).map((nome: string) => (
              <div key={nome} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="font-black text-slate-800 uppercase text-sm tracking-tight">{nome}</span>
                  <span className="text-lg font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-xl">
                    {notas[nome].toFixed(1)}
                  </span>
                </div>
                <input 
                  type="range" min="1" max="5" step="0.5"
                  className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  value={notas[nome]}
                  onChange={(e) => setNotas({...notas, [nome]: parseFloat(e.target.value)})}
                />
              </div>
            ))}
            
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50 to-transparent">
              <button 
                onClick={enviarVotos}
                disabled={enviando}
                className="w-full max-w-md mx-auto block bg-slate-900 text-white font-black py-5 rounded-2xl shadow-2xl hover:bg-black active:scale-95 transition-all uppercase tracking-widest text-sm"
              >
                {enviando ? 'ENVIANDO...' : 'CONFIRMAR NOTAS'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}