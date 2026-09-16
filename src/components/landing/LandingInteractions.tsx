"use client";

import { useEffect } from "react";

/**
 * Reproduz as interações da landing page original (navbar ao rolar, menu
 * mobile, fade-in no scroll, contadores animados, accordion do FAQ,
 * parallax do hero e botão voltar ao topo).
 *
 * Por quê um componente separado rodando em useEffect, em vez de "código
 * React idiomático" com estado?
 * A landing page é 100% markup estático (Server Component) — não faz
 * sentido reescrever tudo com useState só para reproduzir comportamento
 * que já funcionava perfeitamente em DOM puro. Este componente não
 * renderiza nada (retorna null); ele só "liga" o comportamento depois
 * que o HTML já está na tela, do mesmo jeito que o script.js original
 * fazia com `DOMContentLoaded`.
 *
 * Os elementos são selecionados por ID e atributos `data-*` (nunca por
 * classe do CSS Module, já que essas classes são renomeadas/hasheadas
 * em tempo de build e não existem mais como strings fixas no DOM).
 */
export function LandingInteractions() {
  useEffect(() => {
    /* ---------- NAVBAR: fundo ao rolar + troca de logo ---------- */
    const navbar = document.getElementById("navbar");
    const navbarLogo = document.getElementById("navbarLogo") as HTMLImageElement | null;
    const lightLogoSrc = navbarLogo?.dataset.lightSrc;
    const darkLogoSrc = navbarLogo?.dataset.darkSrc;

    function updateNavbarState() {
      if (!navbar) return;
      const isScrolled = window.scrollY > 40;

      if (isScrolled) {
        navbar.classList.add("is-scrolled");
      } else {
        navbar.classList.remove("is-scrolled");
      }

      // Troca o src diretamente (em vez de duas imagens + CSS mostrando/
      // escondendo) — mais simples e sem depender de seletor CSS nenhum.
      if (navbarLogo && lightLogoSrc && darkLogoSrc) {
        const desiredSrc = isScrolled ? darkLogoSrc : lightLogoSrc;
        if (!navbarLogo.src.endsWith(desiredSrc)) {
          navbarLogo.src = desiredSrc;
        }
      }
    }
    updateNavbarState();
    window.addEventListener("scroll", updateNavbarState, { passive: true });

    /* ---------- MENU MOBILE ---------- */
    const navToggle = document.getElementById("navToggle");
    const mobileMenu = document.getElementById("mobileMenu");

    function toggleMobileMenu() {
      if (!mobileMenu || !navToggle) return;
      const isOpen = mobileMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      navToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    }
    navToggle?.addEventListener("click", toggleMobileMenu);

    function closeMobileMenu() {
      if (!mobileMenu || !navToggle) return;
      mobileMenu.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Abrir menu");
    }
    const mobileLinks = mobileMenu ? Array.from(mobileMenu.querySelectorAll("a")) : [];
    mobileLinks.forEach((link) => link.addEventListener("click", closeMobileMenu));

    /* ---------- FADE-IN CONFORME O SCROLL ---------- */
    const revealEls = document.querySelectorAll("[data-reveal]");
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));

    /* ---------- CONTADORES ANIMADOS ---------- */
    const statNumbers = document.querySelectorAll("[data-count]");

    function animateCount(el: Element) {
      const target = parseInt(el.getAttribute("data-count") ?? "0", 10) || 0;
      const prefix = el.getAttribute("data-prefix") ?? "";
      const suffix = el.getAttribute("data-suffix") ?? "";
      const duration = 1600;
      const start = performance.now();

      function tick(now: number) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const value = Math.round(eased * target);
        el.textContent = `${prefix}${value.toLocaleString("pt-BR")}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            entry.target.closest("[data-stat]")?.classList.add("is-counted");
            statsObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    statNumbers.forEach((el) => statsObserver.observe(el));

    /* ---------- FAQ EM ACCORDION ---------- */
    const accordionTriggers = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-accordion-trigger]"));

    function handleAccordionClick(trigger: HTMLButtonElement) {
      const panel = trigger.nextElementSibling as HTMLElement | null;
      if (!panel) return;
      const isOpen = trigger.getAttribute("aria-expanded") === "true";

      accordionTriggers.forEach((otherTrigger) => {
        if (otherTrigger !== trigger) {
          otherTrigger.setAttribute("aria-expanded", "false");
          const otherPanel = otherTrigger.nextElementSibling as HTMLElement | null;
          if (otherPanel) otherPanel.style.maxHeight = "";
        }
      });

      trigger.setAttribute("aria-expanded", String(!isOpen));
      panel.style.maxHeight = isOpen ? "" : `${panel.scrollHeight}px`;
    }

    const accordionHandlers = accordionTriggers.map((trigger) => {
      const handler = () => handleAccordionClick(trigger);
      trigger.addEventListener("click", handler);
      return { trigger, handler };
    });

    /* ---------- PARALLAX LEVE NO HERO ---------- */
    const parallaxEl = document.querySelector<HTMLElement>("[data-parallax]");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function updateParallax() {
      if (!parallaxEl) return;
      const offset = window.scrollY;
      const translateY = Math.min(offset * 0.25, 120);
      parallaxEl.style.transform = `translateY(${translateY}px)`;
    }
    if (!prefersReducedMotion) {
      window.addEventListener("scroll", updateParallax, { passive: true });
    }

    /* ---------- BOTÃO VOLTAR AO TOPO ---------- */
    const backToTop = document.getElementById("backToTop");

    function updateBackToTop() {
      if (!backToTop) return;
      if (window.scrollY > 600) {
        backToTop.classList.add("is-visible");
      } else {
        backToTop.classList.remove("is-visible");
      }
    }
    updateBackToTop();
    window.addEventListener("scroll", updateBackToTop, { passive: true });

    function scrollToTop() {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    }
    backToTop?.addEventListener("click", scrollToTop);

    /* ---------- LIMPEZA ---------- */
    return () => {
      window.removeEventListener("scroll", updateNavbarState);
      window.removeEventListener("scroll", updateParallax);
      window.removeEventListener("scroll", updateBackToTop);
      navToggle?.removeEventListener("click", toggleMobileMenu);
      mobileLinks.forEach((link) => link.removeEventListener("click", closeMobileMenu));
      accordionHandlers.forEach(({ trigger, handler }) => trigger.removeEventListener("click", handler));
      backToTop?.removeEventListener("click", scrollToTop);
      revealObserver.disconnect();
      statsObserver.disconnect();
    };
  }, []);

  return null;
}
