/**
 * Widget oficial do iFood: a bolinha flutuante com chat com o cliente,
 * notificações, acompanhamento do pedido, status e pausa da loja. Quem desenha
 * e mantém é o iFood (Developer Portal → Widgets, slug `cardapidex-painel`).
 *
 * Regras da documentação do iFood que este componente segue:
 * - init UMA vez por página, só com parâmetros válidos: init com lista vazia
 *   (ou trocar a lista) derruba a sessão autorizada do lojista;
 * - até 10 merchants — vão TODAS as lojas do usuário com iFood, não a loja
 *   selecionada, para trocar de loja no painel não reiniciar o widget;
 * - não mexer em estilo/posição: é overlay do iFood (posição no portal).
 *
 * TELA BRANCA (20/11): o iframe do widget cobre a tela inteira (fixed, sem
 * clique) e deveria ser transparente. Com o painel em `color-scheme: dark` e
 * a página do iFood clara, o navegador pinta um fundo OPACO atrás do iframe
 * (regra do CSS Color Adjust para esquemas diferentes) — sobrava só a bolinha.
 * Correção sem tocar no widget: ele nasce num contêiner nosso
 * (`containerSelector`, opção oficial) com `color-scheme: light`.
 *
 * No 1º uso o próprio widget pede "Autorizar" no Portal do Parceiro (login do
 * dono da loja no iFood). A sessão fica em cookie de terceiro, por máquina.
 */
import { useEffect, useState } from 'react';

import api from '../../services/api';

export const WIDGET_DO_IFOOD_ID = 'a203e725-c866-4992-99fd-005eae8097e9';
const SCRIPT = 'https://widgets.ifood.com.br/widget.js';

type Config = { widgetId: string; merchantIds: string[]; containerSelector: string };
type IfoodWidgetApi = { init: (c: Config) => void };
export const CONTEINER_ID = 'cardapidex-widget-ifood';

/** Contêiner com esquema claro: sem ele o iframe do iFood vira uma tela branca no tema escuro. */
const conteiner = () => {
  let el = document.getElementById(CONTEINER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = CONTEINER_ID;
    el.style.colorScheme = 'light';
    document.body.appendChild(el);
  }
  return `#${CONTEINER_ID}`;
};
type ComWidget = typeof window & { iFoodWidget?: IfoodWidgetApi; __ifoodWidgetIniciado?: boolean };

const carregarScript = () => new Promise<void>((pronto, falhou) => {
  const existente = document.head.querySelector<HTMLScriptElement>('script[data-ifood-widget]');
  if (existente && (window as ComWidget).iFoodWidget && existente.dataset.carregado === '1') { pronto(); return; }
  const s = existente ?? document.createElement('script');
  s.addEventListener('load', () => { s.dataset.carregado = '1'; pronto(); }, { once: true });
  s.addEventListener('error', () => falhou(new Error('widget do iFood não carregou')), { once: true });
  if (!existente) {
    s.src = SCRIPT;
    s.async = true;
    s.dataset.ifoodWidget = '1';
    document.head.appendChild(s);
  }
});

export const WidgetDoIfood: React.FC = () => {
  const [merchants, setMerchants] = useState<string[] | null>(null);

  useEffect(() => {
    // API lenta no carregamento (timeout) não pode sumir com o widget até o F5:
    // tenta de novo, espaçando, até a lista chegar.
    let vivo = true;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const buscar = (tentativa: number) => {
      api.get('/stores/integracoes/ifood/merchants/')
        .then((r) => { if (vivo) setMerchants(((r.data as { merchant_ids?: string[] }).merchant_ids ?? []).slice(0, 10)); })
        .catch(() => {
          if (vivo && tentativa < 6) espera = setTimeout(() => buscar(tentativa + 1), 15_000 * tentativa);
        });
    };
    buscar(1);
    return () => { vivo = false; clearTimeout(espera); };
  }, []);

  useEffect(() => {
    const w = window as ComWidget;
    if (!merchants?.length || w.__ifoodWidgetIniciado) return;
    carregarScript()
      .then(() => {
        if (w.__ifoodWidgetIniciado || !w.iFoodWidget) return;
        w.__ifoodWidgetIniciado = true;
        w.iFoodWidget.init({ widgetId: WIDGET_DO_IFOOD_ID, merchantIds: merchants, containerSelector: conteiner() });
      })
      .catch(() => { /* sem widget: o painel segue igual */ });
  }, [merchants]);

  return null;
};

export default WidgetDoIfood;
