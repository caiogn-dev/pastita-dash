import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api, { normalizePaginatedResponse } from '../../services/api';
import { getProducts, StoreProduct } from '../../services/storesApi';
import { Button, Card } from '../../components/ui';
import SeletorDeIngrediente from './SeletorDeIngrediente';

interface Ingredient { id:string; display_name:string }
interface Row { ingredient:string; quantity_g:string }
interface Calc {
  per_100g:Record<string,string|null>;
  label_per_100g?:Record<string,string|null>;
  missing_nutrients:string[];
  /** Ingredientes que ninguém preencheu — trabalho do lojista. */
  incomplete_ingredients?:string[];
  /** Nutriente que a FONTE não mede: resolve com fabricante ou laudo. */
  unmeasured_by_nutrient?:Record<string,string[]>;
  allergens?:{ texto?:string; revisado?:boolean; ingredientes_sem_revisao?:string[] };
  front_of_pack?:{ texto?:string[]; conclusivo?:boolean; indefinidos?:string[] };
}
interface Recipe { id:string; serving_size_g:string; household_measure:string; status:string; items:Row[]; calculation?: Calc }
interface Perfil { id:string; is_print_approved:boolean; physical_form:string }

export default function RecipeBuilder({storeSlug,ingredients,productId,storeUuid}:{storeSlug?:string;ingredients:Ingredient[];productId?:string;storeUuid?:string}) {
  const [products,setProducts]=useState<StoreProduct[]>([]); const [product,setProduct]=useState(productId||'');
  // Aberto de dentro do produto, ele É o contexto: escolher produto de novo
  // seria pedir ao dono que confirmasse onde já está.
  const embutido=Boolean(productId);
  useEffect(()=>{if(productId)setProduct(productId);},[productId]);
  // Nomes dos ingredientes já escolhidos, para a linha mostrar o que é sem
  // depender da lista completa estar carregada.
  const [nomes,setNomes]=useState<Record<string,string>>({});
  const [recipe,setRecipe]=useState<Recipe|null>(null); const [rows,setRows]=useState<Row[]>([]);
  const [serving,setServing]=useState('100'); const [measure,setMeasure]=useState('1 unidade'); const [saving,setSaving]=useState(false);
  const [perfil,setPerfil]=useState<Perfil|null>(null);
  useEffect(()=>{if(!storeSlug||embutido)return;getProducts({store:storeSlug,status:'active',page_size:500}).then(r=>setProducts(r.results)).catch(()=>toast.error('Erro ao carregar pratos'));},[storeSlug]);
  useEffect(()=>{if(!product){setRecipe(null);setRows([]);return;}api.get('/nutrition/recipes/',{params:{product,page_size:1}}).then(r=>{const found=normalizePaginatedResponse<Recipe>(r.data)[0]||null;setRecipe(found);setRows(found?.items||[]);setServing(found?.serving_size_g||'100');setMeasure(found?.household_measure||'1 unidade');}).catch(()=>toast.error('Erro ao carregar receita'));
    api.get('/nutrition/profiles/',{params:{product,page_size:1}}).then(r=>setPerfil(normalizePaginatedResponse<Perfil>(r.data)[0]||null)).catch(()=>{});},[product]);
  const salvarPerfil=async(campos:Partial<Perfil>)=>{ if(!perfil) return toast.error('Salve a receita antes'); try{ const r=await api.patch(`/nutrition/profiles/${perfil.id}/`,campos); setPerfil(r.data); toast.success('Perfil atualizado'); }catch{ toast.error('Não foi possível atualizar o perfil'); } };
  const available=useMemo(()=>ingredients.filter(i=>!rows.some(r=>r.ingredient===i.id)),[ingredients,rows]);
  const save=async()=>{if(!product||rows.length===0)return toast.error('Escolha o prato e adicione ingredientes');if(rows.some(r=>!r.ingredient))return toast.error('Há linha sem ingrediente escolhido');setSaving(true);const payload={product,serving_size_g:serving,household_measure:measure,status:'estimated',calculation_mode:'calculated',items:rows.map((r,i)=>({...r,sort_order:i}))};try{const response=recipe?await api.patch(`/nutrition/recipes/${recipe.id}/`,payload):await api.post('/nutrition/recipes/',payload);setRecipe(response.data);toast.success('Receita calculada e perfil nutricional atualizado');}catch{toast.error('Não foi possível salvar a receita');}finally{setSaving(false)}};
  return <Card className="p-5 space-y-4">{!embutido&&<div><h2 className="text-lg font-semibold">Receita do prato</h2><p className="text-sm opacity-65">Escolha o prato e informe os ingredientes e seus pesos. O resultado vira a tabela nutricional dele.</p></div>}<div className="grid md:grid-cols-3 gap-3">{!embutido&&<label className="text-sm md:col-span-1">Produto<select className="mt-1 w-full rounded border p-2 bg-transparent" value={product} onChange={e=>setProduct(e.target.value)}><option value="">Selecione…</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}<label className="text-sm">Porção (g)<input type="number" min="1" className="mt-1 w-full rounded border p-2 bg-transparent" value={serving} onChange={e=>setServing(e.target.value)}/></label><label className="text-sm">Medida caseira<input className="mt-1 w-full rounded border p-2 bg-transparent" value={measure} onChange={e=>setMeasure(e.target.value)}/></label></div>{product&&<><div className="space-y-2">{rows.map((row,index)=><div key={`${row.ingredient}-${index}`} className="grid grid-cols-[1fr,120px,auto] gap-2"><SeletorDeIngrediente storeId={storeUuid} valor={row.ingredient?{id:row.ingredient,display_name:nomes[row.ingredient]||ingredients.find(i=>i.id===row.ingredient)?.display_name||'Ingrediente'}:null} aoEscolher={op=>{setNomes(n=>({...n,[op.id]:op.display_name}));setRows(rows.map((r,i)=>i===index?{...r,ingredient:op.id}:r))}}/><input aria-label="Quantidade em gramas" type="number" min="0.001" step="0.1" className="rounded border p-2 bg-transparent" value={row.quantity_g} onChange={e=>setRows(rows.map((r,i)=>i===index?{...r,quantity_g:e.target.value}:r))}/><button className="px-3 text-red-600" onClick={()=>setRows(rows.filter((_,i)=>i!==index))}>Remover</button></div>)}</div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={()=>setRows([...rows,{ingredient:'',quantity_g:'100'}])}>Adicionar ingrediente</Button><Button disabled={saving||!rows.length} onClick={save}>{saving?'Calculando…':'Salvar e calcular'}</Button></div>{recipe?.calculation&&(()=>{const c=recipe.calculation!;const pronto=!c.incomplete_ingredients?.length&&Boolean(c.front_of_pack?.conclusivo)&&Boolean(c.allergens?.revisado);return <div className="rounded-lg border border-black/10 p-3 space-y-3">
      <div><p className="font-semibold text-sm">Resumo por 100 g <span className="font-normal opacity-60 text-xs">(valores da etiqueta, arredondados pela IN 75/2020)</span></p>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">{Object.entries(c.label_per_100g??c.per_100g).map(([k,v])=><div key={k}><span className="opacity-60">{k.replace(/_/g,' ')}</span><strong className="block">{v??'—'}</strong></div>)}</div></div>

      <div className="flex flex-wrap gap-2 text-xs">
        {c.front_of_pack?.conclusivo
          ? (c.front_of_pack.texto?.length
              ? c.front_of_pack.texto.map(t=><span key={t} className="bg-black text-white font-bold px-2 py-1 rounded">{t}</span>)
              : <span className="text-green-700">Avaliado: não atinge os limites da lupa frontal</span>)
          : <span className="text-amber-700">Lupa frontal indefinida — falta {c.front_of_pack?.indefinidos?.join(', ')}</span>}
      </div>

      <div className="text-xs">{c.allergens?.revisado
        ? <span className="font-semibold uppercase">{c.allergens.texto}</span>
        : <span className="text-amber-700">Alergênicos não declarados: revise {c.allergens?.ingredientes_sem_revisao?.join(', ')} na lista acima.</span>}</div>

      {/* Duas pendências diferentes: o que falta cadastrar é trabalho do dono;
          o que a fonte não mede não se resolve digitando. */}
      {!!c.incomplete_ingredients?.length&&<p className="text-xs text-amber-700">Sem dado nutricional: {c.incomplete_ingredients.join(', ')}</p>}
      {!!c.unmeasured_by_nutrient&&Object.keys(c.unmeasured_by_nutrient).length>0&&<p className="text-xs opacity-70">A fonte não mede: {Object.keys(c.unmeasured_by_nutrient).map(k=>k.replace(/_/g,' ')).join(', ')} — precisa de ficha do fabricante ou laudo.</p>}

      {perfil&&<div className="border-t border-black/10 pt-3 flex flex-wrap items-center gap-3">
        <label className="text-xs flex items-center gap-1.5">Forma
          <select className="rounded border p-1 bg-transparent" value={perfil.physical_form} onChange={e=>salvarPerfil({physical_form:e.target.value})}>
            <option value="solido">Sólido</option><option value="liquido">Líquido</option>
          </select>
          <span className="opacity-60">(líquido tem metade do limite da lupa)</span>
        </label>
        <div className="flex-1"/>
        {perfil.is_print_approved
          ? <span className="text-xs text-green-700 font-medium">✓ Aprovado para impressão</span>
          : <span className="text-xs opacity-60">Não aprovado</span>}
        <Button variant={perfil.is_print_approved?'secondary':'primary'} disabled={!pronto&&!perfil.is_print_approved}
          onClick={()=>salvarPerfil({is_print_approved:!perfil.is_print_approved})}>
          {perfil.is_print_approved?'Revogar aprovação':'Aprovar para impressão'}
        </Button>
        {!pronto&&!perfil.is_print_approved&&<p className="w-full text-xs text-amber-700">Só dá para aprovar quando todos os ingredientes têm dado, a lupa está conclusiva e os alergênicos foram revisados.</p>}
      </div>}
    </div>})()}</>}</Card>;
}
