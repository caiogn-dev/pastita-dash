import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage, normalizePaginatedResponse } from '../../services/api';
import { salvarRevisaoDeAlergenicos } from '../../services/nutrition';
import { getProducts, StoreProduct } from '../../services/storesApi';
import { Button, Card } from '../../components/ui';
import SeletorDeIngrediente from './SeletorDeIngrediente';
import BarraDeComposicao from './BarraDeComposicao';
import { paraCampo } from './numeroDeReceita';
import { listaDeNomes, listaDeNutrientes } from './rotulosDeNutriente';
import { TrashIcon } from '@heroicons/react/24/outline';

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
  // Prévia ao vivo: o backend calcula sem gravar, então os números da porção
  // acompanham quem está mexendo nas gramas em vez de só aparecerem no salvar.
  const [previa,setPrevia]=useState<Calc|null>(null);
  // Revisar alergênico sem sair da receita: sair para a lista de ingredientes,
  // achar cada um e voltar é onde a pessoa desiste.
  const [revisandoAlergenico,setRevisandoAlergenico]=useState(false);
  const [alergenicos,setAlergenicos]=useState<{valor:string;rotulo:string}[]>([]);
  const [pendentes,setPendentes]=useState<{id:string;store:string|null;display_name:string;allergens:string[];may_contain:string[]}[]>([]);
  const [salvandoAlergenico,setSalvandoAlergenico]=useState('');

  const [recipe,setRecipe]=useState<Recipe|null>(null); const [rows,setRows]=useState<Row[]>([]);
  const [serving,setServing]=useState('100'); const [measure,setMeasure]=useState('1 unidade'); const [saving,setSaving]=useState(false);
  const [perfil,setPerfil]=useState<Perfil|null>(null);
  useEffect(()=>{if(!storeSlug||embutido)return;getProducts({store:storeSlug,status:'active',page_size:500}).then(r=>setProducts(r.results)).catch(()=>toast.error('Erro ao carregar pratos'));},[storeSlug]);
  useEffect(()=>{if(!product){setRecipe(null);setRows([]);return;}api.get('/nutrition/recipes/',{params:{product,page_size:1}}).then(r=>{const found=normalizePaginatedResponse<Recipe>(r.data)[0]||null;setRecipe(found);setRows((found?.items||[]).map(i=>({...i,quantity_g:paraCampo(i.quantity_g)})));setServing(paraCampo(found?.serving_size_g)||'100');setMeasure(found?.household_measure||'1 unidade');}).catch(()=>toast.error('Erro ao carregar receita'));
    api.get('/nutrition/recipes/',{params:{product,page_size:1}}).then(async r=>{
      // Sem isto a barra rotula tudo como "Ingrediente": o nome só existia
      // para o que foi escolhido nesta sessão.
      const itens=normalizePaginatedResponse<Recipe>(r.data)[0]?.items||[];
      const achados=await Promise.all(itens.map(i=>api.get(`/nutrition/ingredients/${i.ingredient}/`).then(x=>[i.ingredient,x.data.display_name] as const).catch(()=>null)));
      setNomes(n=>({...n,...Object.fromEntries(achados.filter(Boolean) as (readonly [string,string])[])}));
    }).catch(()=>{});
    api.get('/nutrition/profiles/',{params:{product,page_size:1}}).then(r=>setPerfil(normalizePaginatedResponse<Perfil>(r.data)[0]||null)).catch(()=>{});},[product]);
  const salvarPerfil=async(campos:Partial<Perfil>)=>{ if(!perfil) return toast.error('Salve a receita antes'); try{ const r=await api.patch(`/nutrition/profiles/${perfil.id}/`,campos); setPerfil(r.data); toast.success('Perfil atualizado'); }catch{ toast.error('Não foi possível atualizar o perfil'); } };
  const available=useMemo(()=>ingredients.filter(i=>!rows.some(r=>r.ingredient===i.id)),[ingredients,rows]);
  useEffect(()=>{
    const prontos=rows.filter(r=>r.ingredient&&Number(r.quantity_g)>0);
    if(!prontos.length){setPrevia(null);return undefined;}
    const id=setTimeout(()=>{
      api.post('/nutrition/recipes/previa/',{items:prontos,serving_size_g:serving,physical_form:perfil?.physical_form||'solido'})
        .then(r=>setPrevia(r.data)).catch(()=>{});
    },450);
    return ()=>clearTimeout(id);
  },[rows,serving,perfil?.physical_form]);
  // O salvo manda quando existe; a prévia cobre o que ainda não foi gravado.
  const calc:Calc|undefined=previa??recipe?.calculation;
  const pesoTotal=rows.reduce((t,r)=>t+(Number(r.quantity_g)||0),0);
  useEffect(()=>{ if(!revisandoAlergenico) return;
    api.get('/nutrition/alergenicos/').then(r=>setAlergenicos(r.data.alergenicos||[])).catch(()=>{});
    const nomesPendentes=previa?.allergens?.ingredientes_sem_revisao||recipe?.calculation?.allergens?.ingredientes_sem_revisao||[];
    Promise.all(rows.filter(r=>r.ingredient).map(r=>api.get(`/nutrition/ingredients/${r.ingredient}/`).then(x=>x.data).catch(()=>null)))
      .then(lista=>setPendentes(lista.filter(Boolean).filter((i)=>nomesPendentes.includes(i.display_name))));
  },[revisandoAlergenico,previa,recipe,rows]);
  // Alimento oficial (TACO/POF) não é editável: a base é compartilhada entre
  // lojistas. Revisar um deles ADOTA uma cópia na loja e reaponta esta receita
  // — por isso a linha troca de id e a receita precisa ser relida.
  const marcarRevisado=async(ing:{id:string;store:string|null;allergens:string[];may_contain:string[]})=>{
    setSalvandoAlergenico(ing.id);
    try{
      const r=await salvarRevisaoDeAlergenicos(ing,
        {allergens:ing.allergens||[],may_contain:ing.may_contain||[],allergens_reviewed:true},storeUuid);
      setPendentes(p=>p.filter(x=>x.id!==ing.id));
      if(r.adotado){
        setRows(rs=>rs.map(linha=>linha.ingredient===ing.id?{...linha,ingredient:r.id}:linha));
        toast.success('Alimento adotado na sua loja e alergênicos revisados');
      } else {
        setPrevia(p=>p?{...p}:p);
        toast.success('Alergênicos revisados');
      }
    }catch(e){ toast.error(getErrorMessage(e)); } finally{ setSalvandoAlergenico(''); }
  };
  const fatias=rows.filter(r=>r.ingredient&&Number(r.quantity_g)>0).map(r=>({id:r.ingredient,nome:nomes[r.ingredient]||ingredients.find(i=>i.id===r.ingredient)?.display_name||'Ingrediente',gramas:Number(r.quantity_g)}));
  const save=async()=>{if(!product||rows.length===0)return toast.error('Escolha o prato e adicione ingredientes');if(rows.some(r=>!r.ingredient))return toast.error('Há linha sem ingrediente escolhido');setSaving(true);const payload={product,serving_size_g:serving,household_measure:measure,status:'estimated',calculation_mode:'calculated',items:rows.map((r,i)=>({...r,sort_order:i}))};try{const response=recipe?await api.patch(`/nutrition/recipes/${recipe.id}/`,payload):await api.post('/nutrition/recipes/',payload);setRecipe(response.data);toast.success('Receita calculada e perfil nutricional atualizado');}catch{toast.error('Não foi possível salvar a receita');}finally{setSaving(false)}};
  return <Card className="p-5 space-y-4">{!embutido&&<div><h2 className="text-lg font-semibold">Receita do prato</h2><p className="text-sm opacity-65">Escolha o prato e informe os ingredientes e seus pesos. O resultado vira a tabela nutricional dele.</p></div>}<div className="grid md:grid-cols-3 gap-3">{!embutido&&<label className="text-sm md:col-span-1">Produto<select className="mt-1 w-full rounded border p-2 bg-transparent" value={product} onChange={e=>setProduct(e.target.value)}><option value="">Selecione…</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}<label className="text-sm">Porção (g)<input type="number" min="1" className="mt-1 w-full rounded border p-2 bg-transparent" value={serving} onChange={e=>setServing(e.target.value)}/></label><label className="text-sm">Medida caseira<input className="mt-1 w-full rounded border p-2 bg-transparent" value={measure} onChange={e=>setMeasure(e.target.value)}/></label></div>{product&&<><div className="max-w-2xl space-y-2"><div className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><span className="tabular-nums"><b>{pesoTotal||0} g</b><span className="opacity-60"> no total · porção {serving} g</span></span></div><BarraDeComposicao fatias={fatias}/></div>
      <div className="max-w-2xl">
      <div className="grid grid-cols-[minmax(0,1fr)_84px_44px_32px] gap-2 pb-1 text-xs uppercase tracking-wide opacity-50"><span>Ingrediente</span><span className="text-right">Peso</span><span className="text-right">%</span><span/></div>
      <div className="space-y-0">{rows.map((row,index)=><div key={`${row.ingredient}-${index}`} className="grid grid-cols-[minmax(0,1fr)_84px_44px_32px] items-center gap-2 border-b border-black/5 py-0.5 last:border-0"><SeletorDeIngrediente storeId={storeUuid} valor={row.ingredient?{id:row.ingredient,display_name:nomes[row.ingredient]||ingredients.find(i=>i.id===row.ingredient)?.display_name||'Ingrediente'}:null} aoEscolher={op=>{setNomes(n=>({...n,[op.id]:op.display_name}));setRows(rows.map((r,i)=>i===index?{...r,ingredient:op.id}:r))}}/><div className="relative"><input aria-label="Quantidade em gramas" type="number" min="0.001" step="0.1" className="w-full rounded border p-1.5 pr-6 bg-transparent text-right tabular-nums" value={row.quantity_g} onChange={e=>setRows(rows.map((r,i)=>i===index?{...r,quantity_g:e.target.value}:r))}/><span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-50">g</span></div><span className="text-right text-xs tabular-nums opacity-65">{pesoTotal>0&&Number(row.quantity_g)>0?`${Math.round(Number(row.quantity_g)/pesoTotal*100)}%`:'—'}</span><button aria-label={`Remover ${nomes[row.ingredient]||'ingrediente'}`} className="rounded p-1 opacity-45 hover:opacity-100 hover:text-red-600" onClick={()=>setRows(rows.filter((_,i)=>i!==index))}><TrashIcon className="h-4 w-4"/></button></div>)}</div></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={()=>setRows([...rows,{ingredient:'',quantity_g:'100'}])}>Adicionar ingrediente</Button><Button disabled={saving||!rows.length} onClick={save}>{saving?'Calculando…':'Salvar e calcular'}</Button></div>{calc&&(()=>{const c=calc;const culpados=c.incomplete_ingredients||[];const pronto=!c.incomplete_ingredients?.length&&Boolean(c.front_of_pack?.conclusivo)&&Boolean(c.allergens?.revisado);return <div className="rounded-lg border border-black/10 p-3 space-y-3">
      <div><p className="font-semibold text-sm">Resumo por 100 g <span className="font-normal opacity-60 text-xs">(valores da etiqueta, arredondados pela IN 75/2020)</span></p>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">{Object.entries(c.label_per_100g??c.per_100g).map(([k,v])=><div key={k}><span className="opacity-60">{k.replace(/_/g,' ')}</span><strong className="block">{v??'—'}</strong></div>)}</div></div>

      <div className="flex flex-wrap gap-2 text-xs">
        {c.front_of_pack?.conclusivo
          ? (c.front_of_pack.texto?.length
              ? c.front_of_pack.texto.map(t=><span key={t} className="bg-black text-white font-bold px-2 py-1 rounded">{t}</span>)
              : <span className="text-green-700">Avaliado: não atinge os limites da lupa frontal</span>)
          : <span className="text-amber-700">Lupa frontal indefinida — sem {listaDeNutrientes(c.front_of_pack?.indefinidos)}{culpados.length?<> por causa de <b>{listaDeNomes(culpados)}</b></>:null}</span>}
      </div>

      <div className="text-xs">{c.allergens?.revisado
        ? <span className="font-semibold uppercase">{c.allergens.texto}</span>
        : <span className="text-amber-700">Alergênicos não declarados — {c.allergens?.ingredientes_sem_revisao?.length} ingrediente(s) sem revisão.</span>}</div>

      {/* Duas pendências diferentes: o que falta cadastrar é trabalho do dono;
          o que a fonte não mede não se resolve digitando. */}
      {/* Pendências como lista com ação: o botão desabilitado dizia o que
          faltava e abandonava a pessoa lá. */}
      <div className="border-t border-black/10 pt-3 space-y-1.5">
        <p className="text-sm font-medium">Para liberar a etiqueta</p>
        {([
          ['Ingredientes com dado', !c.incomplete_ingredients?.length, listaDeNomes(c.incomplete_ingredients)],
          ['Alergênicos revisados', Boolean(c.allergens?.revisado), listaDeNomes(c.allergens?.ingredientes_sem_revisao)],
          // A falta de nutriente quase nunca é um problema próprio: costuma ser
          // consequência de um ingrediente sem dado. Mostrar os três campos
          // fazia parecer três pendências onde havia uma.
          ['Rotulagem frontal', Boolean(c.front_of_pack?.conclusivo),
            culpados.length
              ? `depende de ${listaDeNomes(culpados)}, que está sem dado`
              : `sem ${listaDeNutrientes(c.front_of_pack?.indefinidos)} — vem de ficha do fabricante ou laudo`],
        ] as const).map(([rotulo,ok,detalhe])=>(
          <div key={rotulo} className="flex flex-wrap items-baseline gap-2 text-xs">
            <span className={ok?'text-green-700':'text-amber-700'}>{ok?'✓':'⚠'}</span>
            <span className="font-medium">{rotulo}</span>
            <span className="opacity-70 flex-1 min-w-32">{ok?'pronto':detalhe}</span>
            {!ok&&rotulo==='Alergênicos revisados'&&<button type="button" className="underline underline-offset-2" onClick={()=>setRevisandoAlergenico(true)}>revisar aqui →</button>}
          </div>
        ))}
      </div>
      {!!c.unmeasured_by_nutrient&&Object.keys(c.unmeasured_by_nutrient).length>0&&<p className="text-xs opacity-70">A fonte não mede {listaDeNutrientes(Object.keys(c.unmeasured_by_nutrient))} — isso vem de ficha do fabricante ou laudo, não de cadastro.</p>}

      {revisandoAlergenico&&<div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">Revisar alergênicos</p>
          <button type="button" className="text-xs underline" onClick={()=>setRevisandoAlergenico(false)}>fechar</button>
        </div>
        {!pendentes.length&&<p className="text-xs opacity-70">Nada pendente nesta receita.</p>}
        {pendentes.map(ing=>(
          <div key={ing.id} className="rounded border border-black/10 p-2.5 space-y-2">
            <p className="text-sm font-medium">{ing.display_name}
              {!ing.store&&<span className="ml-2 text-xs font-normal opacity-60">alimento oficial — será copiado para a sua loja</span>}</p>
            <div className="flex flex-wrap gap-1.5">{alergenicos.map(a=>{const on=(ing.allergens||[]).includes(a.valor);return (
              <button key={a.valor} type="button" aria-pressed={on}
                onClick={()=>setPendentes(p=>p.map(x=>x.id===ing.id?{...x,allergens:on?x.allergens.filter(v=>v!==a.valor):[...(x.allergens||[]),a.valor]}:x))}
                className={`px-2 py-0.5 rounded-full border text-xs ${on?'bg-red-600 text-white border-red-600':'border-black/20 opacity-80'}`}>{a.rotulo}</button>);})}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" disabled={salvandoAlergenico===ing.id} onClick={()=>marcarRevisado(ing)}>
                {salvandoAlergenico===ing.id?'Salvando…':(ing.store?'Marcar como revisado':'Adotar e marcar como revisado')}
              </Button>
              {/* Sem alergênico é uma resposta válida — mas precisa ser dita,
                  não deduzida do silêncio. */}
              <span className="text-xs opacity-65">Nenhum marcado = não contém alergênico.</span>
            </div>
          </div>
        ))}
      </div>}

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

      </div>}
    </div>})()}</>}</Card>;
}
