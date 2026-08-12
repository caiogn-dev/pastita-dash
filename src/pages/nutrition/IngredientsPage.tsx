import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BeakerIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api, { normalizePaginatedResponse } from '../../services/api';
import { getStores } from '../../services/storesApi';
import { Button, Card, SearchInput } from '../../components/ui';
import { Loading } from '../../components/common';
import RecipeBuilder from './RecipeBuilder';

type NutrientKey = 'energy_kcal'|'carbohydrates_g'|'total_sugars_g'|'added_sugars_g'|'protein_g'|'total_fat_g'|'saturated_fat_g'|'trans_fat_g'|'fiber_g'|'sodium_mg';
interface Ingredient { id:string; store:string|null; display_name:string; canonical_name:string; category:string; source:string; allergens?:string[]; may_contain?:string[]; allergens_reviewed?:boolean; [key:string]: unknown }
interface Alergenico { valor:string; rotulo:string; gluten:boolean }
const nutrients: {key:NutrientKey; label:string; unit:string}[] = [
  {key:'energy_kcal',label:'Energia',unit:'kcal'}, {key:'carbohydrates_g',label:'Carboidratos',unit:'g'},
  {key:'total_sugars_g',label:'Açúcares totais',unit:'g'}, {key:'added_sugars_g',label:'Açúcares adicionados',unit:'g'},
  {key:'protein_g',label:'Proteínas',unit:'g'}, {key:'total_fat_g',label:'Gorduras totais',unit:'g'},
  {key:'saturated_fat_g',label:'Gorduras saturadas',unit:'g'}, {key:'trans_fat_g',label:'Gorduras trans',unit:'g'},
  {key:'fiber_g',label:'Fibra alimentar',unit:'g'}, {key:'sodium_mg',label:'Sódio',unit:'mg'},
];
const empty = { display_name:'', canonical_name:'', category:'', source:'manual', default_unit:'g' } as Record<string, string>;

export default function IngredientsPage() {
  const { storeId } = useParams<{storeId:string}>();
  const [items,setItems]=useState<Ingredient[]>([]); const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState(''); const [category,setCategory]=useState(''); const [aba,setAba]=useState<'loja'|'base'>('loja'); const [editing,setEditing]=useState<Ingredient|null>(null);
  const [modalOpen,setModalOpen]=useState(false);
  const [form,setForm]=useState<Record<string,string>>(empty); const [storeUuid,setStoreUuid]=useState<string>();
  // Alergênicos ficam FORA do `form` (que é tudo string) porque são listas.
  const [alergenicos,setAlergenicos]=useState<Alergenico[]>([]);
  const [contem,setContem]=useState<string[]>([]); const [podeConter,setPodeConter]=useState<string[]>([]);
  const [revisado,setRevisado]=useState(false);
  // A lista dos 21 grupos da RDC 26/2015 vem da API: repetir a lista legal
  // aqui garantiria que um dia as duas divirjam.
  useEffect(()=>{api.get('/nutrition/alergenicos/').then(r=>setAlergenicos(r.data.alergenicos||[])).catch(()=>{});},[]);
  const load=useCallback(async()=>{ setLoading(true); try {
    const stores=await getStores(); const store=stores.results?.find(s=>s.slug===storeId || s.id===storeId); setStoreUuid(store?.id);
    const res=await api.get('/nutrition/ingredients/',{params:{store:store?.id,page_size:500}}); setItems(normalizePaginatedResponse<Ingredient>(res.data));
  } catch { toast.error('Não foi possível carregar os ingredientes'); } finally { setLoading(false); }},[storeId]);
  useEffect(()=>{load();},[load]);
  const categories=useMemo(()=>[...new Set(items.map(i=>i.category).filter(Boolean))].sort(),[items]);
  // A base pública (TACO + POF) tem milhares de linhas e enterrava tudo que é
  // da loja — inclusive o construtor de receita, que ficava abaixo da dobra.
  const daLoja=items.filter(i=>i.store); const daBase=items.filter(i=>!i.store);
  const fonte=aba==='loja'?daLoja:daBase;
  const visible=fonte.filter(i=>(!category||i.category===category)&&(!search||i.display_name.toLowerCase().includes(search.toLowerCase())));
  const open=(item?:Ingredient)=>{setEditing(item||null);setForm(item?Object.fromEntries(Object.entries(item).map(([k,v])=>[k,v==null?'':String(v)])):{...empty});
    setContem(item?.allergens??[]); setPodeConter(item?.may_contain??[]); setRevisado(Boolean(item?.allergens_reviewed)); setModalOpen(true);};
  const alternar=(lista:string[],set:(v:string[])=>void,valor:string)=>set(lista.includes(valor)?lista.filter(v=>v!==valor):[...lista,valor]);
  const save=async()=>{ if(!form.display_name.trim()) return toast.error('Informe o nome'); const payload={...form,canonical_name:form.canonical_name||form.display_name,store:editing?.store??storeUuid,...Object.fromEntries(nutrients.map(n=>[n.key,form[n.key]===''?null:form[n.key]])),
      // Um alergênico marcado como "contém" nunca vai também em "pode conter":
      // a norma proíbe amaciar uma certeza com advertência de traço.
      allergens:contem, may_contain:podeConter.filter(v=>!contem.includes(v)), allergens_reviewed:revisado};
    try { if(editing) await api.patch(`/nutrition/ingredients/${editing.id}/`,payload); else await api.post('/nutrition/ingredients/',payload); toast.success('Ingrediente salvo'); setEditing(null);setForm(empty);setModalOpen(false);await load(); } catch { toast.error('Revise os valores informados'); }};
  const remove=async(item:Ingredient)=>{if(!confirm(`Desativar ${item.display_name}?`))return;try{await api.delete(`/nutrition/ingredients/${item.id}/`);await load();}catch{toast.error('Ingrediente usado em receita não pode ser removido');}};
  if(loading)return <Loading/>;
  return <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold flex items-center gap-2"><BeakerIcon className="w-7 h-7"/>Ingredientes e TACO</h1><p className="text-sm opacity-70 mt-1">Valores por 100 g, com fonte explícita. Campos ausentes não viram zero.</p></div><Button onClick={()=>open()}><PlusIcon className="w-5 h-5"/>Novo ingrediente</Button></header>
    <RecipeBuilder storeSlug={storeId} ingredients={items}/>
    <Card className="p-4 flex flex-wrap gap-3 items-center"><div className="inline-flex rounded-lg border border-black/15 overflow-hidden text-sm">{([['loja',`Meus ingredientes (${daLoja.length})`],['base',`Base TACO/POF (${daBase.length})`]] as const).map(([v,rotulo])=><button key={v} type="button" onClick={()=>setAba(v)} className={`px-3 py-1.5 ${aba===v?'bg-black/80 text-white':'hover:bg-black/5'}`}>{rotulo}</button>)}</div><div className="min-w-56 flex-1"><SearchInput placeholder="Buscar ingrediente…" value={search} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>setSearch(e.target.value)}/></div><select className="rounded border border-black/15 bg-transparent px-3" value={category} onChange={e=>setCategory(e.target.value)}><option value="">Todas as categorias</option>{categories.map(c=><option key={c}>{c}</option>)}</select></Card>
    <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-black/5"><tr><th className="text-left p-3">Ingrediente</th><th className="text-left p-3">Fonte</th><th className="text-left p-3">Alergênicos</th>{nutrients.map(n=><th key={n.key} className="text-right p-3 whitespace-nowrap">{n.label}<span className="block text-xs font-normal opacity-60">{n.unit}/100g</span></th>)}<th/></tr></thead><tbody>{visible.map(i=><tr key={i.id} className="border-t border-black/10 hover:bg-black/[.025]"><td className="p-3"><button className="text-left font-medium hover:underline" onClick={()=>open(i)}>{i.display_name}</button><div className="text-xs opacity-60">{i.category||'Sem categoria'}</div></td><td className="p-3 uppercase text-xs">{i.source}</td><td className="p-3 text-xs">{!i.allergens_reviewed?<span className="text-amber-600">não revisado</span>:(i.allergens?.length?<span className="text-red-600">{i.allergens.join(', ')}</span>:<span className="opacity-60">sem alergênico</span>)}</td>{nutrients.map(n=><td key={n.key} className="p-3 text-right tabular-nums">{i[n.key]==null?'—':String(i[n.key])}</td>)}<td className="p-3">{i.store?<button aria-label={`Excluir ${i.display_name}`} onClick={()=>remove(i)} className="p-2 opacity-60 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>:<span className="text-xs opacity-50 px-2">oficial</span>}</td></tr>)}</tbody></table></div></Card>
    {modalOpen&&<div className="fixed inset-0 z-50 bg-black/45 grid place-items-center p-4" onMouseDown={e=>{if(e.target===e.currentTarget){setModalOpen(false);setEditing(null);setForm(empty)}}}><Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4"><h2 className="text-xl font-semibold">{editing?'Editar ingrediente':'Novo ingrediente'}</h2><div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Nome<input className="mt-1 w-full rounded border p-2 bg-transparent" value={form.display_name||''} onChange={e=>setForm({...form,display_name:e.target.value,canonical_name:e.target.value})}/></label><label className="text-sm">Categoria<input className="mt-1 w-full rounded border p-2 bg-transparent" value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}/></label>{nutrients.map(n=><label key={n.key} className="text-sm">{n.label} ({n.unit}/100 g)<input type="number" min="0" step="0.0001" className="mt-1 w-full rounded border p-2 bg-transparent" value={form[n.key]||''} onChange={e=>setForm({...form,[n.key]:e.target.value})}/></label>)}</div><section className="border-t border-black/10 pt-4 space-y-3">
      <div><h3 className="font-semibold">Alergênicos <span className="text-xs font-normal opacity-60">RDC 26/2015</span></h3>
      <p className="text-xs opacity-70">A etiqueta monta a frase sozinha a partir daqui. Enquanto houver ingrediente não revisado na receita, ela não declara nada — melhor calar que afirmar “não contém” sem alguém ter olhado.</p></div>
      <div><div className="text-sm font-medium mb-1">Contém</div><div className="flex flex-wrap gap-1.5">{alergenicos.map(a=>{const on=contem.includes(a.valor);return <button key={a.valor} type="button" aria-pressed={on} onClick={()=>alternar(contem,setContem,a.valor)} className={`px-2.5 py-1 rounded-full border text-xs ${on?'bg-red-600 text-white border-red-600':'border-black/20 opacity-80 hover:opacity-100'}`}>{a.rotulo}{a.gluten&&' ⚠'}</button>})}</div></div>
      <div><div className="text-sm font-medium mb-1">Pode conter <span className="font-normal opacity-60 text-xs">(contaminação cruzada)</span></div><div className="flex flex-wrap gap-1.5">{alergenicos.filter(a=>!contem.includes(a.valor)).map(a=>{const on=podeConter.includes(a.valor);return <button key={a.valor} type="button" aria-pressed={on} onClick={()=>alternar(podeConter,setPodeConter,a.valor)} className={`px-2.5 py-1 rounded-full border text-xs ${on?'bg-amber-500 text-white border-amber-500':'border-black/20 opacity-80 hover:opacity-100'}`}>{a.rotulo}</button>})}</div></div>
      <label className="flex items-start gap-2 text-sm rounded border border-black/15 p-3"><input type="checkbox" className="mt-0.5" checked={revisado} onChange={e=>setRevisado(e.target.checked)}/><span><b>Alergênicos revisados</b><span className="block text-xs opacity-70">Marque só depois de conferir a embalagem ou a ficha técnica. Lista vazia sem esta marca significa “ninguém olhou”, não “não tem”.</span></span></label>
    </section>
    <p className="text-xs opacity-65">Use “—”/vazio quando a fonte não informar o nutriente. Para impressão oficial, complete açúcares e gorduras com ficha do fabricante, TBCA ou laudo.</p><div className="flex justify-end gap-2"><Button variant="secondary" onClick={()=>{setModalOpen(false);setEditing(null);setForm(empty)}}>Cancelar</Button><Button onClick={save}>Salvar</Button></div></Card></div>}
  </div>;
}
