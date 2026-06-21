/**
 * axeTranslations.js
 *
 * Dicionário de "Linguagem Simples" para violações do axe-core.
 *
 * Motivação (Pré-Projeto, seção de Linguagem Simples):
 *   O axe-core retorna mensagens técnicas em inglês projetadas para
 *   desenvolvedores. Este módulo transforma essas mensagens em frases
 *   humanas, preventivas e em português — acessíveis tanto para quem
 *   mantém o site quanto para quem o usa.
 *
 * Estrutura de cada entrada:
 *   title       — nome curto da violação em PT-BR
 *   description — o que o problema significa para o usuário final
 *   tip         — o que o desenvolvedor/responsável deve corrigir
 *   wcag        — referência normativa (WCAG / ABNT NBR 17225:2025)
 *
 * Cobertura: regras WCAG 2.0 A/AA · WCAG 2.1 AA · WCAG 2.2 AA · best-practice
 * Fonte de IDs: https://dequeuniversity.com/rules/axe/
 */

/** @type {Record<string, {title: string, description: string, tip: string, wcag: string}>} */
const AXE_TRANSLATIONS = {

  // ─── CONTRASTE E COR ──────────────────────────────────────────────────────

  "color-contrast": {
    title: "Contraste de cor insuficiente",
    description:
      "O texto desta página tem uma cor muito parecida com o fundo, " +
      "dificultando a leitura para pessoas com baixa visão ou daltonismo.",
    tip:
      "Ajuste as cores do texto e do fundo para que a diferença (contraste) " +
      "seja de pelo menos 4,5:1 para texto normal e 3:1 para texto grande. " +
      "Use a ferramenta gratuita WebAIM Contrast Checker para testar.",
    wcag: "WCAG 1.4.3 (AA) · ABNT NBR 17225:2025",
  },

  "color-contrast-enhanced": {
    title: "Contraste de cor insuficiente (nível avançado)",
    description:
      "O contraste entre o texto e o fundo não atinge o nível mais alto " +
      "de acessibilidade (7:1), tornando a leitura difícil para pessoas " +
      "com visão muito reduzida.",
    tip:
      "Para textos normais, busque contraste de 7:1; para textos grandes, 4,5:1. " +
      "Prefira combinações de preto sobre branco ou vice-versa quando possível.",
    wcag: "WCAG 1.4.6 (AAA)",
  },

  "link-in-text-block": {
    title: "Link indistinguível do texto comum",
    description:
      "Um link dentro de um parágrafo é diferenciado apenas pela cor, " +
      "sem sublinhado ou outro indicador visual. Pessoas com daltonismo " +
      "podem não perceber que é clicável.",
    tip:
      "Adicione sublinhado aos links dentro de parágrafos de texto, " +
      "ou use outro indicador visual além da cor (ex.: negrito, ícone).",
    wcag: "WCAG 1.4.1 (A)",
  },

  // ─── IMAGENS ──────────────────────────────────────────────────────────────

  "image-alt": {
    title: "Imagem sem descrição (alt text)",
    description:
      "Esta imagem não possui uma descrição em texto. Pessoas cegas ou " +
      "com deficiência visual que usam leitores de tela não conseguem " +
      "entender o que a imagem mostra.",
    tip:
      'Adicione o atributo alt com uma descrição objetiva da imagem ' +
      '(ex: alt="Gráfico de barras mostrando crescimento de 30% em 2024"). ' +
      'Se a imagem for decorativa, use alt="" (vazio).',
    wcag: "WCAG 1.1.1 (A) · ABNT NBR 17225:2025",
  },

  "image-redundant-alt": {
    title: "Descrição de imagem repetida no texto",
    description:
      "A descrição desta imagem (atributo alt) repete exatamente o texto " +
      "que já está visível ao lado dela. Leitores de tela lerão a mesma " +
      "informação duas vezes, o que é confuso.",
    tip:
      'Se o texto ao redor já explica a imagem, use alt="" ' +
      "para que leitores de tela pulem a imagem silenciosamente.",
    wcag: "Best Practice",
  },

  "input-image-alt": {
    title: "Botão de imagem sem descrição",
    description:
      "Um botão feito com imagem (<input type='image'>) não tem texto " +
      "alternativo. Usuários de leitores de tela não saberão o que " +
      "esse botão faz.",
    tip:
      "Adicione o atributo alt descrevendo a ação do botão " +
      '(ex: alt="Enviar formulário").',
    wcag: "WCAG 1.1.1 (A)",
  },

  "object-alt": {
    title: "Objeto incorporado sem descrição",
    description:
      "Um objeto incorporado (como um PDF, Flash ou applet) não tem " +
      "conteúdo alternativo em texto. Tecnologias assistivas não " +
      "conseguem interpretar este conteúdo.",
    tip:
      "Adicione um texto descritivo dentro da tag <object> ou " +
      "forneça uma alternativa em HTML ao lado do objeto.",
    wcag: "WCAG 1.1.1 (A)",
  },

  "role-img-alt": {
    title: "Elemento com papel de imagem sem descrição",
    description:
      "Um elemento marcado como imagem (role='img') não tem um rótulo " +
      "acessível. Leitores de tela não conseguirão descrevê-lo.",
    tip:
      "Adicione aria-label ou aria-labelledby ao elemento com role='img'.",
    wcag: "WCAG 1.1.1 (A)",
  },

  "svg-img-alt": {
    title: "Ícone SVG sem descrição acessível",
    description:
      "Um ícone ou imagem SVG não possui descrição para tecnologias " +
      "assistivas. Usuários de leitores de tela não saberão o que ele representa.",
    tip:
      "Adicione <title> dentro do SVG, ou use aria-label no elemento SVG. " +
      "Se o ícone for decorativo, adicione aria-hidden='true'.",
    wcag: "WCAG 1.1.1 (A)",
  },

  // ─── FORMULÁRIOS ──────────────────────────────────────────────────────────

  "label": {
    title: "Campo de formulário sem rótulo",
    description:
      "Um campo de formulário (caixa de texto, seleção etc.) não tem " +
      "um rótulo (label) associado. Usuários de leitores de tela não " +
      "saberão o que devem digitar nesse campo.",
    tip:
      "Adicione uma tag <label for='id-do-campo'>Nome do campo</label> " +
      "associada ao campo, ou use aria-label diretamente no input.",
    wcag: "WCAG 1.3.1 (A) · WCAG 4.1.2 (A) · ABNT NBR 17225:2025",
  },

  "select-name": {
    title: "Lista de seleção sem rótulo acessível",
    description:
      "Um elemento de seleção (<select>) não possui um rótulo que " +
      "tecnologias assistivas possam ler.",
    tip:
      "Adicione um <label> associado ao select ou use aria-label no próprio elemento.",
    wcag: "WCAG 4.1.2 (A)",
  },

  "input-button-name": {
    title: "Botão de formulário sem nome acessível",
    description:
      "Um botão (<input type='button'> ou <input type='submit'>) está " +
      "vazio ou sem valor legível. Usuários de leitores de tela não " +
      "entenderão o que esse botão faz.",
    tip:
      "Adicione o atributo value com o texto do botão " +
      "(ex: value='Enviar') ou use aria-label.",
    wcag: "WCAG 4.1.2 (A)",
  },

  "autocomplete-valid": {
    title: "Atributo de autocompletar inválido",
    description:
      "Um campo de formulário tem um valor de autocomplete incorreto. " +
      "Isso impede que navegadores e tecnologias assistivas preencham " +
      "campos automaticamente para pessoas com dificuldades motoras.",
    tip:
      "Use valores válidos para o atributo autocomplete, como 'name', " +
      "'email', 'tel', 'street-address' etc., conforme a especificação HTML.",
    wcag: "WCAG 1.3.5 (AA)",
  },

  "form-field-multiple-labels": {
    title: "Campo com múltiplos rótulos",
    description:
      "Este campo de formulário possui mais de um rótulo associado, " +
      "o que pode confundir leitores de tela que não sabem qual rótulo " +
      "usar.",
    tip:
      "Mantenha apenas um <label> por campo. Use aria-describedby " +
      "para adicionar instruções extras sem criar um segundo label.",
    wcag: "WCAG 3.3.2 (A)",
  },

  // ─── BOTÕES E LINKS ───────────────────────────────────────────────────────

  "button-name": {
    title: "Botão sem nome acessível",
    description:
      "Este botão não tem texto ou rótulo que leitores de tela possam " +
      "anunciar. Usuários cegos ouvirão apenas 'botão' sem saber o que " +
      "ele faz.",
    tip:
      "Adicione texto visível dentro do botão, ou use aria-label " +
      "(ex: aria-label='Fechar menu') para botões de ícone.",
    wcag: "WCAG 4.1.2 (A) · ABNT NBR 17225:2025",
  },

  "link-name": {
    title: "Link sem texto descritivo",
    description:
      "Este link não possui texto legível ou descrição acessível. " +
      "Usuários de leitores de tela ouvirão apenas 'link' sem entender " +
      "para onde ele leva.",
    tip:
      "Adicione texto claro dentro do link que descreva seu destino " +
      "(ex: 'Leia mais sobre acessibilidade'). Evite textos genéricos " +
      "como 'clique aqui' ou 'saiba mais' sozinhos.",
    wcag: "WCAG 2.4.4 (A) · WCAG 2.4.9 (AAA)",
  },

  "skip-link": {
    title: "Link 'pular para o conteúdo' ausente ou inativo",
    description:
      "A página não tem um link que permita pular o menu de navegação " +
      "e ir direto ao conteúdo principal. Usuários de teclado e leitores " +
      "de tela precisam navegar por todos os menus a cada página carregada.",
    tip:
      "Adicione um link visível ao foco no topo da página: " +
      "<a href='#conteudo-principal' class='skip-link'>Pular para o conteúdo</a>.",
    wcag: "WCAG 2.4.1 (A)",
  },

  "identical-links-same-purpose": {
    title: "Links com mesmo texto, destinos diferentes",
    description:
      "Existem múltiplos links com o mesmo texto (ex: 'Leia mais'), " +
      "mas que levam a destinos distintos. Isso confunde usuários de " +
      "leitores de tela que navegam por lista de links.",
    tip:
      "Diferencie os textos dos links (ex: 'Leia mais sobre Produto X') " +
      "ou use aria-label para fornecer contexto adicional a cada link.",
    wcag: "WCAG 2.4.9 (AAA)",
  },

  // ─── ESTRUTURA E NAVEGAÇÃO ────────────────────────────────────────────────

  "document-title": {
    title: "Página sem título",
    description:
      "Esta página não tem um título definido (<title>). O título é o " +
      "primeiro elemento que leitores de tela anunciam e aparece na aba " +
      "do navegador. Sem ele, fica difícil entender onde se está.",
    tip:
      "Adicione uma tag <title> dentro do <head> com um título descritivo " +
      "(ex: <title>Cadastro de usuário – Meu Site</title>).",
    wcag: "WCAG 2.4.2 (A)",
  },

  "html-has-lang": {
    title: "Idioma da página não declarado",
    description:
      "A tag HTML não indica em qual idioma o conteúdo está escrito. " +
      "Leitores de tela usam essa informação para escolher o sotaque " +
      "correto da voz sintética. Sem ela, o texto pode ser pronunciado " +
      "de forma errada.",
    tip:
      "Adicione o atributo lang à tag <html>: <html lang='pt-BR'>.",
    wcag: "WCAG 3.1.1 (A) · ABNT NBR 17225:2025",
  },

  "html-lang-valid": {
    title: "Código de idioma inválido",
    description:
      "O atributo lang da página contém um código de idioma que não " +
      "é reconhecido pelos padrões internacionais.",
    tip:
      "Use códigos de idioma válidos: 'pt-BR' para português do Brasil, " +
      "'pt' para português, 'en' para inglês etc.",
    wcag: "WCAG 3.1.1 (A)",
  },

  "html-xml-lang-mismatch": {
    title: "Conflito entre lang e xml:lang",
    description:
      "Os atributos lang e xml:lang da página indicam idiomas diferentes, " +
      "o que pode causar comportamento inesperado em leitores de tela.",
    tip:
      "Certifique-se de que lang e xml:lang tenham o mesmo valor " +
      "(ex: lang='pt-BR' xml:lang='pt-BR').",
    wcag: "WCAG 3.1.1 (A)",
  },

  "heading-order": {
    title: "Hierarquia de títulos fora de ordem",
    description:
      "Os títulos da página (H1, H2, H3...) não seguem uma ordem lógica " +
      "— por exemplo, um H4 aparece logo após um H1, pulando níveis. " +
      "Isso desoriento quem navega pelo site usando atalhos de teclado " +
      "por cabeçalhos.",
    tip:
      "Use os títulos em ordem crescente sem pular níveis: H1 → H2 → H3. " +
      "Cada página deve ter apenas um H1 que descreve seu assunto principal.",
    wcag: "Best Practice · ABNT NBR 17225:2025",
  },

  "page-has-heading-one": {
    title: "Página sem título principal (H1)",
    description:
      "Esta página não possui nenhum título de nível 1 (H1). O H1 é o " +
      "ponto de entrada principal para usuários de leitores de tela " +
      "entenderem do que trata a página.",
    tip:
      "Adicione exatamente um H1 que descreva claramente o assunto " +
      "principal da página.",
    wcag: "Best Practice",
  },

  "empty-heading": {
    title: "Título vazio",
    description:
      "Existe uma tag de título (H1–H6) sem conteúdo textual. " +
      "Leitores de tela anunciam 'título' sem conseguir informar " +
      "o assunto, desorientando o usuário.",
    tip:
      "Preencha o título com texto descritivo ou remova a tag de título " +
      "vazia. Nunca use tags de título apenas para fins visuais.",
    wcag: "WCAG 2.4.6 (AA)",
  },

  "bypass": {
    title: "Sem mecanismo para pular blocos repetitivos",
    description:
      "A página não oferece uma forma de pular menus e cabeçalhos que " +
      "se repetem em todas as páginas. Usuários de teclado precisam " +
      "pressionar Tab dezenas de vezes para chegar ao conteúdo.",
    tip:
      "Implemente links de 'Pular para o conteúdo principal' no início " +
      "da página, ou use landmarks ARIA (main, nav, header) para " +
      "permitir navegação rápida por regiões.",
    wcag: "WCAG 2.4.1 (A)",
  },

  // ─── REGIÕES E LANDMARKS ──────────────────────────────────────────────────

  "region": {
    title: "Conteúdo fora de região identificada",
    description:
      "Parte do conteúdo da página está fora de qualquer região " +
      "identificada (como header, main, footer, nav). Usuários de " +
      "leitores de tela podem não encontrar esse conteúdo ao navegar " +
      "por regiões.",
    tip:
      "Certifique-se de que todo o conteúdo visível da página esteja " +
      "dentro de elementos semânticos como <main>, <header>, <footer>, " +
      "<nav> ou <aside>, ou use os atributos role equivalentes.",
    wcag: "WCAG 1.3.1 (A) · Best Practice",
  },

  "landmark-one-main": {
    title: "Região principal ausente ou duplicada",
    description:
      "A página não tem exatamente uma região principal (<main> ou " +
      "role='main'). Isso impede que usuários de leitores de tela " +
      "pulem direto para o conteúdo central.",
    tip:
      "Adicione exatamente uma tag <main> que envolva o conteúdo " +
      "principal da página.",
    wcag: "Best Practice",
  },

  "landmark-no-duplicate-banner": {
    title: "Cabeçalho (<header>) duplicado",
    description:
      "A página possui mais de um elemento de cabeçalho de nível de " +
      "página (banner), o que cria ambiguidade para tecnologias assistivas.",
    tip:
      "Use apenas um <header> como cabeçalho principal da página. " +
      "Cabeçalhos dentro de <article> ou <section> são permitidos.",
    wcag: "Best Practice",
  },

  "landmark-no-duplicate-contentinfo": {
    title: "Rodapé (<footer>) duplicado",
    description:
      "A página possui mais de um elemento de rodapé de nível de " +
      "página, criando ambiguidade para leitores de tela.",
    tip:
      "Use apenas um <footer> principal. Rodapés dentro de " +
      "<article> ou <section> são permitidos.",
    wcag: "Best Practice",
  },

  // ─── TECLADO E FOCO ───────────────────────────────────────────────────────

  "tabindex": {
    title: "Ordem de tabulação comprometida",
    description:
      "Elementos desta página usam tabindex com valores positivos " +
      "(ex: tabindex='2'), o que força uma ordem de foco artificial " +
      "e confusa para quem navega pelo teclado.",
    tip:
      "Evite tabindex com valores positivos. Use tabindex='0' para " +
      "incluir elementos focáveis na ordem natural do documento, " +
      "ou tabindex='-1' para elementos que só recebem foco via script.",
    wcag: "WCAG 2.4.3 (A)",
  },

  "scrollable-region-focusable": {
    title: "Área rolável inacessível pelo teclado",
    description:
      "Existe uma área com conteúdo rolável que não pode ser acessada " +
      "ou rolada usando apenas o teclado.",
    tip:
      "Adicione tabindex='0' à área rolável para que usuários de " +
      "teclado possam focar nela e usar as teclas de seta para rolar.",
    wcag: "WCAG 2.1.1 (A)",
  },

  "nested-interactive": {
    title: "Elemento interativo dentro de outro",
    description:
      "Um elemento clicável (como um link ou botão) está aninhado " +
      "dentro de outro elemento interativo, criando comportamento " +
      "imprevisível para teclado e tecnologias assistivas.",
    tip:
      "Não aninhe links dentro de botões nem botões dentro de links. " +
      "Reestruture o HTML para que cada elemento interativo seja independente.",
    wcag: "WCAG 4.1.2 (A)",
  },

  "frame-focusable-content": {
    title: "iframe com conteúdo focável mas não acessível",
    description:
      "Um iframe sem título contém elementos interativos. Usuários " +
      "de teclado podem focar nesses elementos sem saber em que " +
      "contexto estão.",
    tip:
      "Adicione o atributo title ao iframe descrevendo seu conteúdo " +
      "(ex: title='Mapa de localização').",
    wcag: "WCAG 4.1.2 (A)",
  },

  "aria-hidden-focus": {
    title: "Elemento oculto do leitor de tela pode receber foco",
    description:
      "Um elemento marcado como aria-hidden='true' (invisível para " +
      "leitores de tela) contém elementos que podem receber foco via " +
      "teclado. Isso cria uma experiência inconsistente.",
    tip:
      "Não oculte elementos com aria-hidden='true' se eles ou seus " +
      "filhos puderem receber foco. Use display:none ou inert para " +
      "ocultar de forma completa.",
    wcag: "WCAG 4.1.2 (A)",
  },

  // ─── ARIA ─────────────────────────────────────────────────────────────────

  "aria-required-attr": {
    title: "Atributo ARIA obrigatório ausente",
    description:
      "Um elemento com um papel ARIA (role) está sem um atributo que " +
      "é obrigatório para esse papel. Isso pode fazer com que " +
      "tecnologias assistivas interpretem o elemento incorretamente.",
    tip:
      "Consulte a especificação ARIA para o role utilizado e adicione " +
      "os atributos obrigatórios. Ex: role='checkbox' requer " +
      "aria-checked.",
    wcag: "WCAG 4.1.2 (A)",
  },

  "aria-valid-attr": {
    title: "Atributo ARIA inválido",
    description:
      "A página contém atributos ARIA que não existem na especificação " +
      "(ex: aria-expandido em vez de aria-expanded). Tecnologias " +
      "assistivas ignorarão esses atributos.",
    tip:
      "Verifique a grafia dos atributos ARIA. Use apenas atributos " +
      "definidos na especificação WAI-ARIA.",
    wcag: "WCAG 4.1.2 (A)",
  },

  "aria-valid-attr-value": {
    title: "Valor de atributo ARIA inválido",
    description:
      "Um atributo ARIA contém um valor que não é aceito para aquele " +
      "atributo (ex: aria-expanded='sim' em vez de 'true'). " +
      "Tecnologias assistivas podem se comportar de forma inesperada.",
    tip:
      "Use valores booleanos corretos ('true'/'false') para atributos " +
      "que exigem isso, e IDs válidos para aria-labelledby/aria-describedby.",
    wcag: "WCAG 4.1.2 (A)",
  },

  "aria-allowed-attr": {
    title: "Atributo ARIA incompatível com o papel do elemento",
    description:
      "Um atributo ARIA está sendo usado em um elemento com um papel " +
      "que não permite esse atributo. Isso cria informações " +
      "contraditórias para tecnologias assistivas.",
    tip:
      "Verifique quais atributos ARIA são permitidos para o role do " +
      "elemento na especificação WAI-ARIA.",
    wcag: "WCAG 4.1.2 (A)",
  },

  "aria-roles": {
    title: "Valor de role ARIA inválido ou depreciado",
    description:
      "Um elemento possui um atributo role com um valor que não existe " +
      "ou foi descontinuado na especificação ARIA.",
    tip:
      "Use apenas roles válidos da especificação WAI-ARIA 1.2, como " +
      "'button', 'dialog', 'navigation', 'alert', 'tab' etc.",
    wcag: "WCAG 4.1.2 (A)",
  },

  "aria-hidden-body": {
    title: "Corpo da página marcado como oculto",
    description:
      "O elemento <body> da página tem aria-hidden='true', o que " +
      "torna todo o conteúdo da página invisível para leitores de tela.",
    tip:
      "Remova aria-hidden='true' do elemento <body>. Nunca aplique " +
      "aria-hidden ao body ou ao html.",
    wcag: "WCAG 4.1.2 (A)",
  },

  "aria-required-children": {
    title: "Elementos filhos ARIA obrigatórios ausentes",
    description:
      "Um elemento com um papel ARIA (role) não contém os elementos " +
      "filhos que são exigidos pela especificação. Ex: um role='list' " +
      "sem filhos role='listitem'.",
    tip:
      "Adicione os elementos filhos obrigatórios ou escolha um role " +
      "diferente que corresponda à estrutura real do seu HTML.",
    wcag: "WCAG 4.1.2 (A)",
  },

  "aria-required-parent": {
    title: "Elemento ARIA fora do contexto correto",
    description:
      "Um elemento com papel ARIA está fora do elemento pai obrigatório. " +
      "Ex: um role='listitem' fora de um role='list'.",
    tip:
      "Garanta que elementos com roles que exigem um pai específico " +
      "estejam dentro do contêiner correto.",
    wcag: "WCAG 4.1.2 (A)",
  },

  // ─── MÍDIA ────────────────────────────────────────────────────────────────

  "video-caption": {
    title: "Vídeo sem legendas",
    description:
      "Um vídeo nesta página não possui legendas. Pessoas surdas ou " +
      "com deficiência auditiva não conseguirão acompanhar o conteúdo " +
      "falado do vídeo.",
    tip:
      "Adicione uma faixa de legendas ao vídeo usando a tag <track> " +
      "com kind='captions'. Certifique-se de que as legendas estejam " +
      "sincronizadas com o áudio.",
    wcag: "WCAG 1.2.2 (A) · ABNT NBR 17225:2025",
  },

  "no-autoplay-audio": {
    title: "Áudio reproduzido automaticamente",
    description:
      "Um elemento de áudio ou vídeo com áudio começa a tocar " +
      "automaticamente quando a página carrega. Isso interfere nos " +
      "leitores de tela e pode ser perturbador.",
    tip:
      "Remova o atributo autoplay, ou garanta que o áudio automático " +
      "dure menos de 3 segundos e forneça um controle de pausa visível.",
    wcag: "WCAG 1.4.2 (A)",
  },

  // ─── TABELAS ──────────────────────────────────────────────────────────────

  "td-headers-attr": {
    title: "Célula de tabela com cabeçalho inválido",
    description:
      "Uma célula de dados da tabela referencia um ID de cabeçalho " +
      "que não existe, tornando a tabela confusa para leitores de tela.",
    tip:
      "Verifique se os IDs no atributo headers de cada <td> correspondem " +
      "a IDs reais de elementos <th> na mesma tabela.",
    wcag: "WCAG 1.3.1 (A)",
  },

  "th-has-data-cells": {
    title: "Cabeçalho de tabela sem células de dados",
    description:
      "Um cabeçalho de tabela (<th>) não está associado a nenhuma " +
      "célula de dados, tornando a estrutura da tabela confusa " +
      "para tecnologias assistivas.",
    tip:
      "Revise a estrutura da tabela para garantir que cada <th> " +
      "tenha células de dados correspondentes na mesma coluna ou linha.",
    wcag: "WCAG 1.3.1 (A)",
  },

  "scope-attr-valid": {
    title: "Atributo scope de tabela inválido",
    description:
      "Um cabeçalho de tabela (<th>) possui um atributo scope com " +
      "valor inválido, impedindo que leitores de tela associem " +
      "corretamente cabeçalhos e dados.",
    tip:
      "Use apenas os valores válidos para scope: 'col', 'row', " +
      "'colgroup' ou 'rowgroup'.",
    wcag: "WCAG 1.3.1 (A)",
  },

  "table-duplicate-name": {
    title: "Tabela com título e resumo iguais",
    description:
      "O título (caption) e o resumo (summary) desta tabela são " +
      "idênticos. Leitores de tela repetirão a mesma informação " +
      "desnecessariamente.",
    tip:
      "O caption deve nomear a tabela e o summary deve descrever " +
      "sua estrutura de forma complementar, não igual.",
    wcag: "Best Practice",
  },

  // ─── LISTAS ───────────────────────────────────────────────────────────────

  "list": {
    title: "Estrutura de lista inválida",
    description:
      "Uma lista (<ul> ou <ol>) contém elementos que não são itens " +
      "de lista (<li>). Isso quebra a semântica esperada por " +
      "tecnologias assistivas.",
    tip:
      "Dentro de <ul> ou <ol>, use apenas elementos <li>. " +
      "Conteúdo extra deve ficar fora da lista ou dentro de um <li>.",
    wcag: "WCAG 1.3.1 (A)",
  },

  "listitem": {
    title: "Item de lista fora de uma lista",
    description:
      "Um elemento <li> existe fora de uma lista (<ul>, <ol> ou " +
      "<menu>). Isso quebra a estrutura semântica da página.",
    tip:
      "Mova o elemento <li> para dentro de uma <ul>, <ol> ou <menu>, " +
      "ou substitua-o por um elemento de bloco adequado como <div> ou <p>.",
    wcag: "WCAG 1.3.1 (A)",
  },

  "definition-list": {
    title: "Lista de definições com estrutura inválida",
    description:
      "Uma lista de definições (<dl>) contém elementos que não são " +
      "<dt> (termos) ou <dd> (definições), quebrando sua estrutura.",
    tip:
      "Dentro de <dl>, use apenas <dt> para termos e <dd> para " +
      "definições. Agrupe-os em <div> se precisar de estilo.",
    wcag: "WCAG 1.3.1 (A)",
  },

  "dlitem": {
    title: "Termo ou definição fora de lista de definições",
    description:
      "Um elemento <dt> ou <dd> existe fora de uma lista de " +
      "definições (<dl>).",
    tip:
      "Mova o elemento <dt> ou <dd> para dentro de um <dl>, ou " +
      "use elementos mais adequados ao contexto.",
    wcag: "WCAG 1.3.1 (A)",
  },

  // ─── META E CONFIGURAÇÕES ─────────────────────────────────────────────────

  "meta-viewport": {
    title: "Zoom do usuário bloqueado",
    description:
      "A meta tag viewport desta página desativa o zoom do usuário " +
      "(user-scalable=no ou maximum-scale=1). Pessoas com baixa visão " +
      "dependem do zoom para ler o conteúdo.",
    tip:
      "Remova user-scalable=no e não defina maximum-scale menor que 5. " +
      "Use: <meta name='viewport' content='width=device-width, " +
      "initial-scale=1'>.",
    wcag: "WCAG 1.4.4 (AA) · WCAG 1.4.10 (AA)",
  },

  "meta-refresh": {
    title: "Atualização automática de página",
    description:
      "Esta página possui uma meta tag que a recarrega ou redireciona " +
      "automaticamente após um tempo. Isso pode desorientar usuários " +
      "de leitores de tela no meio da leitura.",
    tip:
      "Evite meta refresh para redirecionamentos. Use redirecionamentos " +
      "HTTP (301/302) no servidor ou ofereça ao usuário a opção de " +
      "escolher quando atualizar.",
    wcag: "WCAG 2.2.1 (A) · WCAG 3.2.5 (AAA)",
  },

  // ─── OUTROS ───────────────────────────────────────────────────────────────

  "duplicate-id": {
    title: "ID duplicado na página",
    description:
      "Dois ou mais elementos da página compartilham o mesmo ID. " +
      "Quando scripts ou ARIA referenciam esse ID, apenas o primeiro " +
      "elemento é encontrado, quebrando associações de formulários " +
      "e leitores de tela.",
    tip:
      "Cada ID deve ser único na página. Revise seu HTML e JavaScript " +
      "para garantir que cada elemento tenha um ID exclusivo.",
    wcag: "WCAG 4.1.1 (A)",
  },

  "duplicate-id-active": {
    title: "ID duplicado em elemento interativo",
    description:
      "Um elemento interativo (link, botão, input) compartilha seu ID " +
      "com outro elemento. Isso pode causar comportamento imprevisível " +
      "em formulários e na navegação por teclado.",
    tip:
      "Corrija os IDs duplicados em elementos interativos com prioridade, " +
      "pois causam mais impacto do que em elementos estáticos.",
    wcag: "WCAG 4.1.1 (A)",
  },

  "duplicate-id-aria": {
    title: "ID duplicado referenciado por ARIA",
    description:
      "Um ID referenciado por aria-labelledby ou aria-describedby " +
      "existe mais de uma vez na página, tornando as associações ARIA " +
      "imprevisíveis.",
    tip:
      "Garanta que todos os IDs usados em aria-labelledby e " +
      "aria-describedby sejam únicos na página.",
    wcag: "WCAG 4.1.1 (A)",
  },

  "frame-title": {
    title: "iframe sem título descritivo",
    description:
      "Um iframe na página não possui um título (atributo title) que " +
      "descreva seu propósito. Usuários de leitores de tela não " +
      "saberão o que o iframe contém.",
    tip:
      "Adicione title='Descrição do conteúdo' ao elemento <iframe>. " +
      "Se o iframe for decorativo, use title='' e aria-hidden='true'.",
    wcag: "WCAG 4.1.2 (A)",
  },

  "p-as-heading": {
    title: "Parágrafo usado como título",
    description:
      "Um parágrafo (<p>) está formatado visualmente como título " +
      "(com negrito e texto grande), mas não usa tags de título semânticas. " +
      "Leitores de tela não o reconhecerão como ponto de navegação.",
    tip:
      "Substitua o parágrafo por uma tag de título adequada: " +
      "<h2>, <h3> etc. Use CSS para o estilo visual sem perder a semântica.",
    wcag: "WCAG 1.3.1 (A)",
  },

  "marquee": {
    title: "Texto animado (<marquee>)",
    description:
      "A página usa o elemento <marquee> (texto que se move " +
      "automaticamente), que é difícil de ler e não pode ser pausado " +
      "por usuários com dificuldades cognitivas ou motoras.",
    tip:
      "Substitua <marquee> por animações CSS que possam ser pausadas " +
      "com prefers-reduced-motion, ou elimine o texto em movimento.",
    wcag: "WCAG 2.2.2 (A)",
  },

  "avoid-inline-spacing": {
    title: "Espaçamento de texto forçado",
    description:
      "O CSS desta página usa !important para bloquear ajustes de " +
      "espaçamento de texto (line-height, letter-spacing). Isso impede " +
      "que usuários com dislexia apliquem suas configurações pessoais " +
      "de espaçamento.",
    tip:
      "Remova !important das propriedades de espaçamento de texto. " +
      "Permita que o espaçamento possa ser sobrescrito pelo usuário.",
    wcag: "WCAG 1.4.12 (AA)",
  },

  "valid-lang": {
    title: "Código de idioma de trecho inválido",
    description:
      "Um trecho de texto na página possui um atributo lang com " +
      "código de idioma inválido.",
    tip:
      "Use códigos de idioma BCP 47 válidos no atributo lang de " +
      "qualquer elemento que contenha conteúdo em outro idioma.",
    wcag: "WCAG 3.1.2 (AA)",
  },

  "presentation-role-conflict": {
    title: "Conflito de papel de apresentação",
    description:
      "Um elemento com role='presentation' ou role='none' possui " +
      "atributos ARIA ou é focalizável, criando conflito que confunde " +
      "tecnologias assistivas.",
    tip:
      "Não aplique role='none' a elementos interativos ou que tenham " +
      "atributos ARIA. Se o elemento for puramente decorativo, use " +
      "também aria-hidden='true'.",
    wcag: "WCAG 4.1.2 (A)",
  },
};

/**
 * Retorna a tradução em Linguagem Simples para um ID de violação do axe-core.
 * Se o ID não estiver no dicionário, retorna uma mensagem genérica amigável.
 *
 * @param {string} ruleId - ID da regra axe-core (ex: 'color-contrast')
 * @returns {{ title: string, description: string, tip: string, wcag: string }}
 */
const getTranslation = (ruleId) => {
  return (
    AXE_TRANSLATIONS[ruleId] ?? {
      title: "Problema de acessibilidade detectado",
      description:
        `A regra "${ruleId}" identificou um problema nesta página que pode ` +
        "dificultar o acesso para pessoas com deficiência.",
      tip:
        `Consulte a documentação do axe-core para a regra "${ruleId}" em ` +
        `https://dequeuniversity.com/rules/axe/4.x/${ruleId}`,
      wcag: "Consulte a documentação da regra",
    }
  );
};

/**
 * Enriquece um objeto de violação já sanitizado com campos de Linguagem Simples.
 *
 * @param {{ id: string, impact: string, description: string, helpUrl: string, nodes_count: number }} violation
 * @returns {object} Violação enriquecida com human_title, human_description, human_tip e wcag_reference
 */
const enrichWithTranslation = (violation) => {
  const t = getTranslation(violation.id);
  return {
    ...violation,
    human_title: t.title,
    human_description: t.description,
    human_tip: t.tip,
    wcag_reference: t.wcag,
  };
};

module.exports = {
  AXE_TRANSLATIONS,
  getTranslation,
  enrichWithTranslation,
};
