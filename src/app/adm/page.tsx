"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  ClipboardCopy, 
  Users, 
  Trophy, 
  Loader2, 
  LogOut, 
  PlusCircle, 
  History 
} from 'lucide-react'

export default function AdminPage() {
  // --- ESTADOS DE AUTENTICAÇÃO ---
  const [senha, setSenha] = useState('')
  const [autenticado, setAutenticado] = useState(false)
  const [carregandoAuth, setCarregandoAuth] = useState(true)

  // --- ESTADOS DE DADOS ---
  const [partidas, setPartidas] = useState<any[]>([])
  const [titulo, setTitulo] = useState('')
  const [jogadoresTexto, setJogadoresTexto] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')

  // 1. Checar sessão ao carregar a página
  useEffect(() => {
    const authSalva = localStorage.getItem('pelada-admin-auth')
    if (authSalva === 'true') {
      setAutenticado(true)
    }
    setCarregandoAuth(false)
    
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin)
    }
  }, [])

  // 2. Carregar partidas se estiver logado
  useEffect(() => {
    if (autenticado) carregarPartidas()
  }, [autenticado])

  async function carregarPartidas() {
    const { data: listaPartidas } = await supabase
      .from('partidas')
      .select('*')
      .order('data_criacao', { ascending: false })

    if (!listaPartidas) return

    // Busca o progresso de votos para cada partida
    const partidasComProgresso = await Promise.all(
      listaPartidas.map(async (p) => {
        const { data: votos } = await supabase
          .from('votos')
          .select('avaliador')
          .eq('partida_id', p.id)
        const totalVotantes = new Set(votos?.map(v => v.avaliador)).size
        return { ...p, totalVotantes }
      })
    )
    setPartidas(partidasComProgresso)
  }

  // --- HANDLERS ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (senha === 'amigosthiagao') {
      setAutenticado(true)
      localStorage.setItem('pelada-admin-auth', 'true')
    } else {
      alert('Senha incorreta!')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('pelada-admin-auth')
    setAutenticado(false)
    setSenha('')
  }

  const copiarLink = (id: string) => {
    const url = `${baseUrl}/votar/${id}`
    navigator.clipboard.writeText(url)
    alert("Link de votação copiado!")
  }

  async function handleCriarPartida(e: React.FormEvent) {
    e.preventDefault()
    const lista = jogadoresTexto.split('\n').map(n => n.trim()).filter(n => n.length > 0)
    
    if (lista.length % 5 !== 0) {
      return alert(`A lista tem ${lista.length} nomes. Precisa ser múltiplo de 5 para formar os times!`)
    }
    
    setCarregando(true)
    try {
      const { error } = await supabase.from('partidas').insert([{ titulo, jogadores: lista }])
      if (error) throw error
      setTitulo('')
      setJogadoresTexto('')
      await carregarPartidas()
    } catch (err) {
      alert("Erro ao criar partida.")
    } finally {
      setCarregando(false)
    }
  }

  async function encerrarESortear(partidaId: string, listaJogadores: string[]) {
  if (!confirm("Encerrar e aplicar algoritmo de equilíbrio?")) return
  setCarregando(true)

  try {
    const { data: votos } = await supabase.from('votos').select('*').eq('partida_id', partidaId)

    // 1. Cálculo de Médias
    const jogadoresComMedia = listaJogadores.map(nome => {
      const votosDoJogador = votos?.filter(v => v.avaliado === nome) || []
      const soma = votosDoJogador.reduce((acc, v) => acc + Number(v.nota), 0)
      const media = votosDoJogador.length > 0 ? soma / votosDoJogador.length : 3.0
      return { nome, media: parseFloat(media.toFixed(2)) }
    })

    // 2. Ordenação Base
    const ordenados = jogadoresComMedia.sort((a, b) => b.media - a.media)
    const numTimes = listaJogadores.length / 5
    let times: any[][] = Array.from({ length: numTimes }, () => [])

    // 3. Distribuição Inicial (Snake)
    ordenados.forEach((jogador, index) => {
      const rodada = Math.floor(index / numTimes)
      const timeIndex = (rodada % 2 === 0) ? (index % numTimes) : (numTimes - 1 - (index % numTimes))
      times[timeIndex].push(jogador)
    })

    // 4. ALGORITMO DE REFINAMENTO (Hill Climbing)
    // Tenta 100 combinações de trocas para minimizar a variância
    for (let i = 0; i < 100; i++) {
      // Calcula médias atuais
      const calcMedias = () => times.map(t => t.reduce((acc, j) => acc + j.media, 0) / 5)
      let mediasAtuais = calcMedias()
      
      let maxIdx = mediasAtuais.indexOf(Math.max(...mediasAtuais))
      let minIdx = mediasAtuais.indexOf(Math.min(...mediasAtuais))
      
      let melhorTroca = { diff: Math.max(...mediasAtuais) - Math.min(...mediasAtuais), j1: -1, j2: -1 }

      // Testa trocas entre o time mais forte e o mais fraco
      for (let j1 = 0; j1 < 5; j1++) {
        for (let j2 = 0; j2 < 5; j2++) {
          // Simula a troca
          const tempMax = [...times[maxIdx]]; const tempMin = [...times[minIdx]];
          [tempMax[j1], tempMin[j2]] = [tempMin[j2], tempMax[j1]]
          
          const newAvgMax = tempMax.reduce((acc, j) => acc + j.media, 0) / 5
          const newAvgMin = tempMin.reduce((acc, j) => acc + j.media, 0) / 5
          const newDiff = Math.abs(newAvgMax - newAvgMin)

          if (newDiff < melhorTroca.diff) {
            melhorTroca = { diff: newDiff, j1, j2 }
          }
        }
      }

      // Se achou uma troca que equilibra mais, aplica
      if (melhorTroca.j1 !== -1) {
        [times[maxIdx][melhorTroca.j1], times[minIdx][melhorTroca.j2]] = 
        [times[minIdx][melhorTroca.j2], times[maxIdx][melhorTroca.j1]]
      } else {
        break; // Estagnou no melhor equilíbrio possível
      }
    }

    // 5. Salva no Banco
    const { error } = await supabase
      .from('partidas')
      .update({ status: 'fechada', resultado_times: { times } })
      .eq('id', partidaId)
    
    if (error) throw error
    await carregarPartidas()
    alert("Times equilibrados com sucesso!")

  } catch (err) {
    alert("Erro no balanceamento.")
  } finally {
    setCarregando(false)
  }
}

  // --- RENDERS ---

  if (carregandoAuth) return null

  if (!autenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-700">
          <h1 className="text-2xl font-black text-center mb-6 text-white uppercase tracking-widest">Galo Draft</h1>
          <input 
            type="password" 
            placeholder="Senha do Organizador" 
            className="w-full p-4 bg-slate-700 rounded-xl mb-4 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
            value={senha} 
            onChange={e => setSenha(e.target.value)} 
          />
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all active:scale-95">
            ACESSAR PAINEL
          </button>
        </form>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 pb-20">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header e Logout */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800">Painel</h1>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>

        {/* Formulário de Criação */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-black mb-4 flex items-center gap-2 uppercase text-slate-700">
            <PlusCircle size={18}/> Nova Pelada
          </h2>
          <form onSubmit={handleCriarPartida} className="grid gap-4">
            <input 
              required 
              type="text" 
              placeholder="Ex: Pelada de Sábado - 17/04" 
              className="p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50" 
              value={titulo} 
              onChange={e => setTitulo(e.target.value)} 
              disabled={carregando} 
            />
            <textarea 
              required 
              placeholder="Cole a lista do WhatsApp (um nome por linha)..." 
              className="p-4 border border-slate-200 rounded-xl h-32 resize-none outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50" 
              value={jogadoresTexto} 
              onChange={e => setJogadoresTexto(e.target.value)} 
              disabled={carregando} 
            />
            <button 
              disabled={carregando} 
              className="flex justify-center items-center gap-2 bg-slate-900 text-white py-4 rounded-xl font-black hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
            >
              {carregando ? <Loader2 className="animate-spin" /> : 'CRIAR E GERAR LINKS'}
            </button>
          </form>
        </section>

        {/* Lista de Partidas */}
        <section className="space-y-4">
          <h2 className="text-lg font-black uppercase text-slate-700 flex items-center gap-2">
            <History size={18}/> Histórico de Jogos
          </h2>
          
          {partidas.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{p.titulo}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${p.totalVotantes === p.jogadores.length ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {p.totalVotantes} / {p.jogadores.length} Votos Coletados
                    </span>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase">
                      {p.status === 'aberta' ? '🔥 Em andamento' : '✅ Finalizada'}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => copiarLink(p.id)} 
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all"
                  >
                    <ClipboardCopy size={16}/> Copiar Link
                  </button>
                  {p.status === 'aberta' && (
                    <button 
                      onClick={() => encerrarESortear(p.id, p.jogadores)} 
                      disabled={carregando}
                      className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black text-sm active:scale-95 transition-all shadow-lg shadow-blue-100"
                    >
                      {carregando ? <Loader2 className="animate-spin" /> : 'FECHAR E SORTIAR'}
                    </button>
                  )}
                </div>
              </div>

              {/* Exibição dos Times Sorteados */}
              {p.status === 'fechada' && p.resultado_times && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                    {p.resultado_times.times.map((time: any[], idx: number) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="font-black text-blue-600 text-[10px] mb-3 uppercase flex items-center gap-2">
                        <Trophy size={12}/> Time {idx + 1}
                      </h4>
                      <ul className="space-y-1">
                        {time.map((j: any) => (
                          <li key={j.nome} className="flex justify-between text-sm border-b border-slate-100 pb-1 text-slate-700">
                            <span>{j.nome}</span>
                            <span className="font-bold text-slate-400">{j.media.toFixed(1)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 text-[10px] font-black text-slate-400 text-right uppercase">
                        Equilíbrio: {(time.reduce((acc, curr) => acc + curr.media, 0) / 5).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {partidas.length === 0 && (
            <div className="text-center py-20 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase text-sm">
              Nenhuma pelada encontrada. Crie a primeira acima!
            </div>
          )}
        </section>
      </div>
    </main>
  )
}