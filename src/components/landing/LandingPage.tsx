import Link from "next/link";
import Image from "next/image";
import { PLANS, formatCurrency } from "@/config/plans";
import styles from "@/styles/landing.module.css";
import { LandingInteractions } from "./LandingInteractions";

const WHATSAPP_NUMBER = "5513997366362";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.6 6.3A9 9 0 0 0 3.1 17.4L2 22l4.7-1.2A9 9 0 1 0 17.6 6.3ZM12 19.5a7.4 7.4 0 0 1-3.8-1l-.3-.2-2.8.7.7-2.7-.2-.3a7.5 7.5 0 1 1 6.4 3.5Zm4.1-5.6c-.2-.1-1.3-.7-1.6-.7-.2-.1-.4-.1-.5.1s-.6.7-.7.9-.3.2-.5.1a6.1 6.1 0 0 1-1.8-1.1 6.8 6.8 0 0 1-1.2-1.6c-.1-.2 0-.4.1-.5l.4-.4.2-.4v-.4c-.1-.1-.5-1.3-.7-1.7s-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.1 5 5 0 0 0 1 2.6 11.6 11.6 0 0 0 4.4 3.9c.6.3 1.1.4 1.5.6a3.6 3.6 0 0 0 1.6.1 2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

const NAV_LINKS = [
  { href: "#sobre", label: "Sobre" },
  { href: "#servicos", label: "Serviços" },
  { href: "#resultados", label: "Resultados" },
  { href: "#depoimentos", label: "Depoimentos" },
  { href: "#planos", label: "Planos" },
  { href: "#faq", label: "FAQ" },
];

export function LandingPage() {
  return (
    <div className={styles.root}>
      <LandingInteractions />

      {/* ============ NAVBAR ============ */}
      <header className={styles.navbar} id="navbar">
        <div className={`${styles.container} ${styles.navbarInner}`}>
          <a href="#top" className={styles.navbarBrand} aria-label="Thais Santana, ir para o topo">
            {/* eslint-disable-next-line @next/next/no-img-element -- troca de src via JS puro (ver LandingInteractions), não faz sentido com next/image aqui */}
            <img
              className={styles.navbarLogo}
              id="navbarLogo"
              data-light-src="/logo-icon-light.png"
              data-dark-src="/logo-icon-dark.png"
              src="/logo-icon-light.png"
              alt="Thais Santana Personal Trainer"
              width={156}
              height={96}
            />
          </a>

          <nav className={styles.navbarLinks} aria-label="Navegação principal">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <a href="#planos" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary} ${styles.navbarCta}`}>
            Conheça os planos
          </a>

          <button
            className={styles.navbarToggle}
            id="navToggle"
            aria-label="Abrir menu"
            aria-expanded="false"
            aria-controls="mobileMenu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        <nav className={styles.mobileMenu} id="mobileMenu" aria-label="Menu mobile">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          <a href="#planos" className={`${styles.btn} ${styles.btnPrimary}`}>
            Conheça os planos
          </a>
        </nav>
      </header>

      <main id="top">
        {/* ============ HERO ============ */}
        <section className={styles.hero}>
          <div className={styles.heroBg} data-parallax aria-hidden="true">
            <div style={{ position: "relative", width: "100%", height: "115%" }}>
              <Image
                src="/hero-bg.jpg"
                alt=""
                fill
                priority
                sizes="100vw"
                style={{ objectFit: "cover", objectPosition: "72% 55%" }}
              />
            </div>
            <div className={styles.heroOverlay}></div>
          </div>

          <div className={`${styles.container} ${styles.heroInner}`}>
            <p className={`${styles.eyebrow} ${styles.reveal}`} data-reveal>
              CREF 123456-G/SP
            </p>
            <h1 className={`${styles.heroTitle} ${styles.reveal}`} data-reveal>
              Thais Santana
            </h1>
            <p className={`${styles.heroRole} ${styles.reveal}`} data-reveal>
              Personal Trainer
            </p>
            <p className={`${styles.heroPitch} ${styles.reveal}`} data-reveal>
              Transforme seu corpo com treinos personalizados presenciais e online.
            </p>

            <div className={`${styles.heroActions} ${styles.reveal}`} data-reveal>
              <a href="#planos" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}>
                Conheça os planos
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener"
                className={`${styles.btn} ${styles.btnGhost} ${styles.btnLg}`}
                aria-label="Falar com Thais no WhatsApp"
              >
                <WhatsAppIcon className={styles.icon} />
                WhatsApp
              </a>
            </div>

            <ul className={`${styles.heroBadges} ${styles.reveal}`} data-reveal aria-label="Áreas de atendimento">
              <li>Presencial em São Paulo</li>
              <li>Online para todo o Brasil</li>
            </ul>
          </div>

          <div className={styles.heroScroll} aria-hidden="true">
            <span></span>
            <p>Role para conhecer</p>
          </div>
        </section>

        {/* ============ SOBRE ============ */}
        <section className={styles.section} id="sobre">
          <div className={`${styles.container} ${styles.about}`}>
            <div className={`${styles.aboutMedia} ${styles.reveal}`} data-reveal>
              <Image
                src="/foto_perfil.png"
                alt="Thais Santana orientando um treino de musculação em academia"
                width={900}
                height={1100}
                loading="lazy"
              />
              <div className={styles.aboutMediaTag}>
                <strong>8 anos</strong>
                <span>de experiência</span>
              </div>
            </div>

            <div className={styles.aboutContent}>
              <p className={`${styles.eyebrow} ${styles.reveal}`} data-reveal>
                Quem sou
              </p>
              <h2 className={styles.reveal} data-reveal>
                Treino de verdade começa com escuta de verdade.
              </h2>
              <p className={styles.reveal} data-reveal>
                Sou Thais Santana, formada em Educação Física, com 8 anos de estrada dedicados a
                transformar rotinas de treino em resultados reais. Minha especialidade é o
                emagrecimento sustentável e a hipertrofia, sempre respeitando o histórico, a rotina
                e os limites de cada aluno.
              </p>
              <p className={styles.reveal} data-reveal>
                Já acompanhei mais de <strong>400 alunos</strong>, entre atendimentos presenciais em
                São Paulo e consultorias online para todo o Brasil. Acredito em acompanhamento
                humanizado: nada de planilha genérica, cada treino é construído para a sua
                realidade.
              </p>

              <ul className={`${styles.aboutList} ${styles.reveal}`} data-reveal>
                <li>
                  <span className={styles.dot}></span>Especialista em emagrecimento
                </li>
                <li>
                  <span className={styles.dot}></span>Especialista em hipertrofia
                </li>
                <li>
                  <span className={styles.dot}></span>Acompanhamento humanizado e individual
                </li>
                <li>
                  <span className={styles.dot}></span>+400 alunos atendidos
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ============ SERVIÇOS ============ */}
        <section className={`${styles.section} ${styles.sectionMuted}`} id="servicos">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <p className={`${styles.eyebrow} ${styles.reveal}`} data-reveal>
                Serviços
              </p>
              <h2 className={styles.reveal} data-reveal>
                Um plano de treino para cada objetivo
              </h2>
              <p className={`${styles.sectionLede} ${styles.reveal}`} data-reveal>
                Sem planilha genérica. Cada serviço abaixo é construído em cima do seu histórico,
                sua rotina e o resultado que você quer alcançar.
              </p>
            </div>

            <div className={styles.servicesGrid}>
              {SERVICES.map((service) => (
                <article key={service.title} className={`${styles.serviceCard} ${styles.reveal}`} data-reveal>
                  <div className={styles.serviceCardHead}>
                    <span className={styles.serviceCardIcon} aria-hidden="true">
                      {service.icon}
                    </span>
                    <span className={styles.serviceCardTag}>{service.tag}</span>
                  </div>
                  <h3>{service.title}</h3>
                  <p className={styles.serviceCardLede}>{service.lede}</p>
                  <ul className={styles.serviceCardList}>
                    {service.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============ RESULTADOS ============ */}
        <section className={`${styles.section} ${styles.stats}`} id="resultados">
          <div className={styles.container}>
            <div className={`${styles.sectionHead} ${styles.sectionHeadLight}`}>
              <p className={`${styles.eyebrow} ${styles.eyebrowLight} ${styles.reveal}`} data-reveal>
                Resultados
              </p>
              <h2 className={styles.reveal} data-reveal>
                Números que contam a história
              </h2>
            </div>

            <div className={`${styles.grid} ${styles.grid4} ${styles.statsGrid}`}>
              {STATS.map((stat) => (
                <div key={stat.label} className={`${styles.stat} ${styles.reveal}`} data-reveal data-stat>
                  <span
                    className={styles.statNumber}
                    data-count={stat.count}
                    data-prefix={stat.prefix}
                    data-suffix={stat.suffix}
                  >
                    0
                  </span>
                  <span className={styles.statLabel}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ DEPOIMENTOS ============ */}
        <section className={styles.section} id="depoimentos">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <p className={`${styles.eyebrow} ${styles.reveal}`} data-reveal>
                Depoimentos
              </p>
              <h2 className={styles.reveal} data-reveal>
                Quem treina comigo, sente a diferença
              </h2>
            </div>

            <div className={`${styles.grid} ${styles.grid3}`}>
              {TESTIMONIALS.map((testimonial) => (
                <article key={testimonial.name} className={`${styles.testimonial} ${styles.reveal}`} data-reveal>
                  <div className={styles.testimonialStars} aria-label="5 de 5 estrelas">
                    ★★★★★
                  </div>
                  <p>&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className={styles.testimonialAuthor}>
                    <Image
                      src={testimonial.photo}
                      alt={`Foto de ${testimonial.name}`}
                      width={44}
                      height={44}
                      loading="lazy"
                    />
                    <div>
                      <strong>{testimonial.name}</strong>
                      <span>{testimonial.role}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============ PLANOS ============ */}
        <section className={`${styles.section} ${styles.sectionMuted}`} id="planos">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <p className={`${styles.eyebrow} ${styles.reveal}`} data-reveal>
                Planos
              </p>
              <h2 className={styles.reveal} data-reveal>
                Escolha o acompanhamento ideal para você
              </h2>
            </div>

            <div className={`${styles.grid} ${styles.grid3}`}>
              {Object.values(PLANS).map((plan) => (
                <article
                  key={plan.id}
                  className={`${styles.plan} ${plan.highlighted ? styles.planFeatured : ""} ${styles.reveal}`}
                  data-reveal
                >
                  {plan.highlighted && <p className={styles.planBadge}>Mais escolhido</p>}
                  <h3>{plan.name}</h3>
                  <p className={styles.planDesc}>{plan.description}</p>
                  <p className={styles.planPrice}>
                    <span>R$</span>
                    {formatCurrency(plan.monthlyAmount).replace("R$", "").split(",")[0]?.trim()}
                    <small>/mês</small>
                  </p>
                  <ul>
                    {plan.benefits.map((benefit) => (
                      <li key={benefit}>{benefit}</li>
                    ))}
                  </ul>
                  <Link
                    href={`/checkout/${plan.id}`}
                    className={`${styles.btn} ${plan.highlighted ? styles.btnPrimary : styles.btnOutline}`}
                  >
                    Escolher plano
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section className={styles.section} id="faq">
          <div className={`${styles.container} ${styles.faq}`}>
            <div className={styles.sectionHead}>
              <p className={`${styles.eyebrow} ${styles.reveal}`} data-reveal>
                Dúvidas frequentes
              </p>
              <h2 className={styles.reveal} data-reveal>
                Perguntas comuns
              </h2>
            </div>

            <div className={`${styles.accordion} ${styles.reveal}`} data-reveal>
              {FAQ_ITEMS.map((item) => (
                <div key={item.question} className={styles.accordionItem}>
                  <button className={styles.accordionTrigger} aria-expanded="false" data-accordion-trigger>
                    <span>{item.question}</span>
                    <span className={styles.accordionIcon} aria-hidden="true">
                      +
                    </span>
                  </button>
                  <div className={styles.accordionPanel}>
                    <p>{item.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ CTA FINAL ============ */}
        <section className={`${styles.section} ${styles.cta}`} id="contato">
          <div className={`${styles.container} ${styles.ctaInner}`}>
            <h2 className={styles.reveal} data-reveal>
              Pronta para começar sua transformação?
            </h2>
            <p className={styles.reveal} data-reveal>
              Dê o primeiro passo hoje. Conheça os planos ou fale comigo agora mesmo.
            </p>
            <div className={`${styles.ctaActions} ${styles.reveal}`} data-reveal>
              <a
                href="#planos"
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
              >
                Conheça os planos
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener"
                className={`${styles.btn} ${styles.btnGhostDark} ${styles.btnLg}`}
              >
                Falar no WhatsApp
              </a>
            </div>

            <div className={`${styles.contactInfo} ${styles.reveal}`} data-reveal>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener" aria-label="WhatsApp de Thais Santana">
                <WhatsAppIcon className={styles.icon} />
                (13) 99736-6362
              </a>
              <a
                href="https://www.instagram.com/tspersonalsp/"
                target="_blank"
                rel="noopener"
                aria-label="Instagram de Thais Santana"
              >
                <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 2.1.26 2.6.44a5.3 5.3 0 0 1 1.9 1.2 5.3 5.3 0 0 1 1.2 1.9c.18.5.38 1.4.44 2.6.06 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.06 1.2-.26 2.1-.44 2.6a5.3 5.3 0 0 1-1.2 1.9 5.3 5.3 0 0 1-1.9 1.2c-.5.18-1.4.38-2.6.44-1.3.06-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.06-2.1-.26-2.6-.44a5.3 5.3 0 0 1-1.9-1.2 5.3 5.3 0 0 1-1.2-1.9c-.18-.5-.38-1.4-.44-2.6C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.06-1.2.26-2.1.44-2.6a5.3 5.3 0 0 1 1.2-1.9 5.3 5.3 0 0 1 1.9-1.2c.5-.18 1.4-.38 2.6-.44C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.15 0-3.52 0-4.76.07-1 .05-1.6.22-1.97.36-.5.19-.85.42-1.22.79-.37.37-.6.72-.79 1.22-.14.37-.31.94-.36 1.97C2.8 9.44 2.8 9.8 2.8 13s0 3.52.07 4.76c.05 1 .22 1.6.36 1.97.19.5.42.85.79 1.22.37.37.72.6 1.22.79.37.14.94.31 1.97.36 1.24.06 1.6.07 4.76.07s3.52 0 4.76-.07c1-.05 1.6-.22 1.97-.36.5-.19.85-.42 1.22-.79.37-.37.6-.72.79-1.22.14-.37.31-.94.36-1.97.06-1.24.07-1.6.07-4.76s0-3.52-.07-4.76c-.05-1-.22-1.6-.36-1.97a3.5 3.5 0 0 0-.79-1.22 3.5 3.5 0 0 0-1.22-.79c-.37-.14-.94-.31-1.97-.36C15.52 4 15.16 4 12 4Zm0 3.4a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2Zm0 1.8a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm4.8-2a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z" />
                </svg>
                @tspersonalsp
              </a>
              <a href="mailto:contato@thaissantana.fit" aria-label="Email de Thais Santana">
                <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1.4 2 7.4 6.1a.5.5 0 0 0 .4 0L19.6 7H4.4ZM4 8.4V17h16V8.4l-7.4 6.1a2 2 0 0 1-1.2.4 2 2 0 0 1-1.2-.4L4 8.4Z" />
                </svg>
                contato@thaissantana.fit
              </a>
              <span className={styles.locationTag}>
                <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7Zm0 9.5A2.5 2.5 0 1 0 12 6.5a2.5 2.5 0 0 0 0 5Z" />
                </svg>
                São Paulo - SP
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* ============ RODAPÉ ============ */}
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <a href="#top" className={styles.footerBrand}>
            <Image src="/logo-icon-light.png" alt="Thais Santana Personal Trainer" width={156} height={96} className={styles.footerLogo} />
          </a>

          <div className={styles.footerSocial} aria-label="Redes sociais">
            <a href="https://www.instagram.com/tspersonalsp/" target="_blank" rel="noopener" aria-label="Instagram">
              Instagram
            </a>
            <a href="https://tiktok.com/@Thais.trainer" target="_blank" rel="noopener" aria-label="TikTok">
              TikTok
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener" aria-label="WhatsApp">
              WhatsApp
            </a>
            <Link href="/minha-assinatura">Minha assinatura</Link>
          </div>

          <p className={styles.footerRights}>
            © {new Date().getFullYear()} Thais Santana · CREF 123456-G/SP · Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* ============ FLUTUANTES ============ */}
      <a href={WHATSAPP_URL} target="_blank" rel="noopener" className={styles.floatWhatsapp} aria-label="Falar no WhatsApp">
        <WhatsAppIcon className={styles.icon} />
      </a>

      <button className={styles.backToTop} id="backToTop" aria-label="Voltar ao topo">
        <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 4 4 12l1.4 1.4L11 7.8V20h2V7.8l5.6 5.6L20 12Z" />
        </svg>
      </button>
    </div>
  );
}

/* ============================================
   Conteúdo estático das seções (fora do componente para não ser
   recriado a cada render).
   ============================================ */

const SERVICES = [
  {
    tag: "Presencial · São Paulo",
    title: "Personal Presencial",
    lede: "Acompanhamento no chão de academia, com correção de técnica em tempo real — não é só entregar uma ficha e desaparecer.",
    items: [
      "Treinos 100% individuais, sem sessão em grupo",
      "Correção de postura e execução em cada série",
      "Progressão de carga registrada sessão a sessão",
      "Atendimento em academias parceiras na região de São Paulo",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 6.5 4 4M17.5 6.5 20 4M6.5 17.5 4 20M17.5 17.5 20 20" />
        <rect x="2" y="10" width="3" height="4" rx="1" />
        <rect x="19" y="10" width="3" height="4" rx="1" />
        <rect x="6" y="8" width="3" height="8" rx="1" />
        <rect x="15" y="8" width="3" height="8" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
      </svg>
    ),
  },
  {
    tag: "Online · Todo o Brasil",
    title: "Consultoria Online",
    lede: "Direção técnica à distância, pensada pra caber na sua rotina real — treine no seu horário, onde estiver.",
    items: [
      "Plano de treino no aplicativo, com vídeo de cada exercício",
      "Revisão e ajuste de carga a cada 7 dias",
      "Suporte direto por WhatsApp em dias úteis",
      "Adaptado para academia, casa ou espaço com equipamento limitado",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M2 20h20M9 20l1-4h4l1 4" />
      </svg>
    ),
  },
  {
    tag: "Incluso em todos os planos",
    title: "Avaliação e Progressão",
    lede: "Treino sem medição é achismo. Os ajustes são feitos em cima de dados reais da sua evolução, não de sensação.",
    items: [
      "Avaliação física completa a cada 30 dias",
      "Fotos e medidas para comparar sua evolução real",
      "Ajuste de treino baseado nos resultados da reavaliação",
      "Relatório de progresso compartilhado com você",
    ], não em sensação.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 15l4-5 3 3 5-7" />
      </svg>
    ),
  },
  {
    tag: "Complementar",
    title: "Hábitos e Alimentação",
    lede: "O treino rende mais quando o resto da rotina ajuda. Orientação prática, sem dieta pronta ou restrição extrema.",
    items: [
      "Orientações de sono, hidratação e rotina alimentar",
      "Sem dietas restritivas ou planos alimentares genéricos",
      "Ajustes práticos que cabem na sua realidade do dia a dia",
      "Acompanhamento contínuo, revisado junto com o treino",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21c-4-3-8-6.5-8-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 1.6-.7 3-1.7 4.3M14 14l3 3 5-6" />
      </svg>
    ),
  },
];

const STATS = [
  { count: 400, prefix: "+", suffix: "", label: "Alunos atendidos" },
  { count: 8, prefix: "", suffix: "", label: "Anos de experiência" },
  { count: 98, prefix: "", suffix: "%", label: "Satisfação dos alunos" },
  { count: 12000, prefix: "+", suffix: "", label: "Treinos realizados" },
];

const TESTIMONIALS = [
  {
    name: "Camila Ferreira",
    role: "Advogada",
    photo: "https://i.pravatar.cc/120?img=47",
    quote:
      "Em 6 meses com a Thais eu entendi que treino bom não é treino puxado, é treino certo. Perdi 9kg sem sofrimento.",
  },
  {
    name: "Rafael Menezes",
    role: "Analista de TI",
    photo: "https://i.pravatar.cc/120?img=32",
    quote:
      "A consultoria online mudou minha rotina. Treino em casa às 6h da manhã e recebo ajuste toda semana. Simplesmente funciona.",
  },
  {
    name: "Juliana Prado",
    role: "Arquiteta",
    photo: "https://i.pravatar.cc/120?img=45",
    quote:
      "Nunca tinha me sentido tão acompanhada. A Thais entende de treino e entende de gente — isso faz toda a diferença.",
  },
];

const FAQ_ITEMS = [
  {
    question: "Como funciona o acompanhamento?",
    answer:
      "Tudo começa com uma avaliação inicial, presencial ou por chamada, para entender seu histórico e objetivo. A partir daí, monto um plano de treino personalizado e acompanho sua evolução com ajustes periódicos.",
  },
  {
    question: "Posso treinar em casa?",
    answer:
      "Sim. Na consultoria online, os treinos podem ser adaptados para casa, com ou sem equipamentos, de acordo com o que você tiver disponível.",
  },
  {
    question: "Quanto tempo dura cada treino?",
    answer:
      "Em média, entre 45 e 60 minutos, mas isso varia conforme seu objetivo, nível e disponibilidade de tempo na rotina.",
  },
  {
    question: "Preciso de academia?",
    answer:
      "Não necessariamente. Para o atendimento presencial em São Paulo, sim. Já na consultoria online, adapto o treino para academia, casa ou espaços com equipamentos limitados.",
  },
];
