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
interface Ingredient { id:string; store:string|null; display_name:string; canonical_name:string; category:string; source:string; [key:string]: unknown }
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
  const [search,setSearch]=useState(''); const [category,setCategory]=useState(''); const [editing,setEditing]=useState<Ingredient|null>(null);
  const [modalOpen,setModalOpen]=useState(false);
  const [form,setForm]=useState<Record<string,string>>(empty); const [storeUuid,setStoreUuid]=useState<string>();
  const load=useCallback(async()=>{ setLoading(true); try {
    const stores=await getStores(); const store=stores.results?.find(s=>s.slug===storeId || s.id===storeId); setStoreUuid(store?.id);
    const res=await api.get('/nutrition/ingredients/',{params:{store:store?.id,page_size:500}}); setItems(normalizePaginatedResponse<Ingredient>(res.data));
  } catch { toast.error('Não foi possível carregar os ingredientes'); } finally { setLoading(false); }},[storeId]);
  useEffect(()=>{load();},[load]);
  const categories=useMemo(()=>[...new Set(items.map(i=>i.category).filter(Boolean))].sort(),[items]);
  const visible=items.filter(i=>(!category||i.category===category)&&(!search||i.display_name.toLowerCase().includes(search.toLowerCase())));
  const open=(item?:Ingredient)=>{setEditing(item||null);setForm(item?Object.fromEntries(Object.entries(item).map(([k,v])=>[k,v==null?'':String(v)])):{...empty});setModalOpen(true);};
  const save=async()=>{ if(!form.display_name.trim()) return toast.error('Informe o nome'); const payload={...form,canonical_name:form.canonical_name||form.display_name,store:editing?.store??storeUuid,...Object.fromEntries(nutrients.map(n=>[n.key,form[n.key]===''?null:form[n.key]]))};
    try { if(editing) await api.patch(`/nutrition/ingredients/${editing.id}/`,payload); else await api.post('/nutrition/ingredients/',payload); toast.success('Ingrediente salvo'); setEditing(null);setForm(empty);setModalOpen(false);await load(); } catch { toast.error('Revise os valores informados'); }};
  const remove=async(item:Ingredient)=>{if(!confirm(`Desativar ${item.display_name}?`))return;try{await api.delete(`/nutrition/ingredients/${item.id}/`);await load();}catch{toast.error('Ingrediente usado em receita não pode ser removido');}};
  if(loading)return <Loading/>;
  return <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold flex items-center gap-2"><BeakerIcon className="w-7 h-7"/>Ingredientes e TACO</h1><p className="text-sm opacity-70 mt-1">Valores por 100 g, com fonte explícita. Campos ausentes não viram zero.</p></div><Button onClick={()=>open()}><PlusIcon className="w-5 h-5"/>Novo ingrediente</Button></header>
    <Card className="p-4 flex flex-wrap gap-3"><div className="min-w-56 flex-1"><SearchInput placeholder="Buscar ingrediente…" value={search} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>setSearch(e.target.value)}/></div><select className="rounded border border-black/15 bg-transparent px-3" value={category} onChange={e=>setCategory(e.target.value)}><option value="">Todas as categorias</option>{categories.map(c=><option key={c}>{c}</option>)}</select></Card>
    <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-black/5"><tr><th className="text-left p-3">Ingrediente</th><th className="text-left p-3">Fonte</th>{nutrients.map(n=><th key={n.key} className="text-right p-3 whitespace-nowrap">{n.label}<span className="block text-xs font-normal opacity-60">{n.unit}/100g</span></th>)}<th/></tr></thead><tbody>{visible.map(i=><tr key={i.id} className="border-t border-black/10 hover:bg-black/[.025]"><td className="p-3"><button className="text-left font-medium hover:underline" onClick={()=>open(i)}>{i.display_name}</button><div className="text-xs opacity-60">{i.category||'Sem categoria'}</div></td><td className="p-3 uppercase text-xs">{i.source}</td>{nutrients.map(n=><td key={n.key} className="p-3 text-right tabular-nums">{i[n.key]==null?'—':String(i[n.key])}</td>)}<td className="p-3"><button aria-label={`Excluir ${i.display_name}`} onClick={()=>remove(i)} className="p-2 opacity-60 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button></td></tr>)}</tbody></table></div></Card>
    <RecipeBuilder storeSlug={storeId} ingredients={items}/>
    {modalOpen&&<div className="fixed inset-0 z-50 bg-black/45 grid place-items-center p-4" onMouseDown={e=>{if(e.target===e.currentTarget){setModalOpen(false);setEditing(null);setForm(empty)}}}><Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4"><h2 className="text-xl font-semibold">{editing?'Editar ingrediente':'Novo ingrediente'}</h2><div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Nome<input className="mt-1 w-full rounded border p-2 bg-transparent" value={form.display_name||''} onChange={e=>setForm({...form,display_name:e.target.value,canonical_name:e.target.value})}/></label><label className="text-sm">Categoria<input className="mt-1 w-full rounded border p-2 bg-transparent" value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}/></label>{nutrients.map(n=><label key={n.key} className="text-sm">{n.label} ({n.unit}/100 g)<input type="number" min="0" step="0.0001" className="mt-1 w-full rounded border p-2 bg-transparent" value={form[n.key]||''} onChange={e=>setForm({...form,[n.key]:e.target.value})}/></label>)}</div><p className="text-xs opacity-65">Use “—”/vazio quando a fonte não informar o nutriente. Para impressão oficial, complete açúcares e gorduras com ficha do fabricante, TBCA ou laudo.</p><div className="flex justify-end gap-2"><Button variant="secondary" onClick={()=>{setModalOpen(false);setEditing(null);setForm(empty)}}>Cancelar</Button><Button onClick={save}>Salvar</Button></div></Card></div>}
  </div>;
}
