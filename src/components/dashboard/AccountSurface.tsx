'use client';

import React, { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Radar } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/ui';

interface AccountSurfaceProps {
  code: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}

export function AccountSurface({ code, eyebrow, title, description, icon, children }: AccountSurfaceProps) {
  return (
    <div className="accountOS min-h-screen text-white overflow-hidden">
      <Navbar />
      <div className="accountGrid fixed inset-0 pointer-events-none" aria-hidden="true" />
      <div className="accountGlow fixed pointer-events-none" aria-hidden="true" />

      <main className="relative pt-24 pb-20">
        <Container size="small">
          <Link href="/dashboard" className="accountBack">
            <ArrowLeft size={14} aria-hidden="true" />
            Volver al Personal OS
          </Link>

          <section className="accountHero">
            <div className="accountHeroSignal" aria-hidden="true"><span /><span /><span /></div>
            <div className="accountHeroIcon" aria-hidden="true">{icon}</div>
            <div className="relative z-10">
              <div className="accountHeroMeta">
                <p className="accountMicro"><Radar size={11} aria-hidden="true" /> {eyebrow}</p>
                <span>{code}</span>
              </div>
              <h1>{title}<em>.</em></h1>
              <p className="accountHeroCopy">{description}</p>
            </div>
          </section>

          {children}
        </Container>
      </main>

      <style jsx global>{`
        .accountOS{background:#030303}.accountGrid{background-image:linear-gradient(rgba(201,169,98,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(201,169,98,.025) 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(to bottom,black,transparent 88%)}.accountGlow{width:42rem;height:42rem;right:-15rem;top:-15rem;border-radius:50%;background:radial-gradient(circle,rgba(201,169,98,.1),transparent 68%)}
        .accountBack{display:inline-flex;align-items:center;gap:7px;margin-bottom:14px;color:rgba(255,255,255,.4);font-size:9px;letter-spacing:.13em;text-transform:uppercase;transition:color .2s ease}.accountBack:hover{color:var(--accent)}
        .accountHero{position:relative;margin-bottom:18px;padding:28px 30px;border:1px solid rgba(255,255,255,.09);border-radius:24px;overflow:hidden;background:linear-gradient(125deg,rgba(21,21,21,.97),rgba(7,7,7,.95));box-shadow:0 30px 80px rgba(0,0,0,.32),inset 0 1px rgba(255,255,255,.035)}.accountHero:after{content:'';position:absolute;width:260px;height:260px;border:1px solid rgba(201,169,98,.13);border-radius:50%;right:-90px;top:-145px;box-shadow:0 0 0 34px rgba(201,169,98,.022),0 0 0 68px rgba(201,169,98,.014)}.accountHeroSignal{position:absolute;top:0;left:30px;display:flex;gap:4px}.accountHeroSignal span{display:block;width:26px;height:2px;background:rgba(201,169,98,.22)}.accountHeroSignal span:first-child{width:48px;background:var(--accent)}.accountHeroIcon{position:absolute;right:28px;bottom:26px;width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--accent);border:1px solid rgba(201,169,98,.22);background:radial-gradient(circle,rgba(201,169,98,.11),transparent 70%);z-index:1}.accountHeroMeta{display:flex;align-items:center;gap:12px;margin-bottom:13px}.accountHeroMeta>span{font:8px monospace;color:rgba(255,255,255,.2)}.accountHero h1{font-family:var(--font-outfit);font-size:clamp(2.15rem,5vw,3.65rem);font-weight:650;letter-spacing:-.045em;line-height:.98;max-width:82%}.accountHero h1 em{font-style:normal;color:var(--accent)}.accountHeroCopy{max-width:620px;margin-top:13px;color:rgba(255,255,255,.48);font-size:13px;line-height:1.7}
        .accountMicro{display:flex;align-items:center;gap:6px;font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.33);font-weight:650}.accountPanel{position:relative;border-radius:20px;padding:20px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(145deg,rgba(255,255,255,.043),rgba(255,255,255,.014));box-shadow:inset 0 1px rgba(255,255,255,.03),0 22px 60px rgba(0,0,0,.22);backdrop-filter:blur(18px)}.accountPanel+.accountPanel{margin-top:14px}.accountPanelHeader{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,.06)}.accountPanelHeader h2{margin-top:5px;font-family:var(--font-outfit);font-size:20px;font-weight:620}.accountPanelHeader p:last-child{margin-top:5px;color:rgba(255,255,255,.4);font-size:12px;line-height:1.6}.accountNode{width:38px;height:38px;flex:0 0 auto;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--accent);border:1px solid rgba(201,169,98,.22);background:radial-gradient(circle,rgba(201,169,98,.11),transparent 70%)}
        .accountNotice{display:flex;gap:12px;align-items:flex-start;padding:15px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.018);margin-bottom:16px}.accountNotice>svg{flex:0 0 auto;margin-top:1px;color:var(--accent)}.accountNotice strong{display:block;font-size:12px;font-weight:650}.accountNotice p{margin-top:4px;color:rgba(255,255,255,.43);font-size:11px;line-height:1.6}.accountNotice.success{border-color:rgba(52,211,153,.2);background:rgba(52,211,153,.035)}.accountNotice.success>svg,.accountNotice.success strong{color:var(--success)}.accountNotice.warning{border-color:rgba(201,169,98,.2);background:rgba(201,169,98,.035)}.accountNotice.error{border-color:rgba(239,68,68,.25);background:rgba(239,68,68,.045)}.accountNotice.error>svg,.accountNotice.error strong{color:var(--error)}
        .accountSegments{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:16px}.accountSegment{min-height:44px;padding:9px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.018);color:rgba(255,255,255,.43);font-size:9px;font-weight:650;letter-spacing:.08em;text-transform:uppercase;transition:border-color .2s ease,background-color .2s ease,color .2s ease}.accountSegment:hover{border-color:rgba(201,169,98,.2);color:white}.accountSegment.active{border-color:rgba(201,169,98,.35);background:rgba(201,169,98,.1);color:var(--accent)}
        .accountInstruction{margin-bottom:18px;padding:15px 16px;border-radius:13px;border:1px solid rgba(255,255,255,.07);background:rgba(0,0,0,.22);color:rgba(255,255,255,.5);font-size:11px;line-height:1.65}.accountInstruction strong,.accountInstruction .instructionTitle{color:white;font-weight:600}.accountInstruction .mono{font-family:monospace;color:rgba(255,255,255,.62);overflow-wrap:anywhere}.accountField{display:block;margin-bottom:16px}.accountFieldLabel{display:block;margin-bottom:7px;font-size:8px;font-weight:650;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.32)}.accountInput{width:100%;min-height:46px;padding:11px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.085);background:rgba(255,255,255,.025);color:white;font-size:13px;outline:none;transition:border-color .2s ease,box-shadow .2s ease}.accountInput:focus{border-color:rgba(201,169,98,.5);box-shadow:0 0 0 3px rgba(201,169,98,.07)}.accountInput::placeholder{color:rgba(255,255,255,.2)}.accountFile{display:block;width:100%;padding:12px;border-radius:10px;border:1px dashed rgba(255,255,255,.13);background:rgba(255,255,255,.018);color:rgba(255,255,255,.58);font-size:11px}.accountFile::file-selector-button{margin-right:12px;border:1px solid rgba(201,169,98,.24);border-radius:7px;padding:8px 10px;background:rgba(201,169,98,.07);color:var(--accent);font-size:9px;font-weight:650;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}.accountError{margin:0 0 16px;color:var(--error);font-size:11px}.accountMetaRow{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.055);font-size:10px}.accountMetaRow:last-child{border-bottom:0}.accountMetaRow span:first-child{color:rgba(255,255,255,.32)}.accountMetaRow span:last-child{color:rgba(255,255,255,.68);text-align:right}
        @media(max-width:640px){.accountHero{padding:24px 20px}.accountHeroSignal{left:20px}.accountHeroIcon{right:18px;bottom:20px;width:42px;height:42px}.accountHero h1{max-width:78%}.accountPanel{padding:16px}.accountSegments{grid-template-columns:1fr 1fr}.accountPanel{backdrop-filter:blur(10px)}}@media(prefers-reduced-motion:reduce){.accountBack,.accountSegment,.accountInput{transition:none}}
      `}</style>
    </div>
  );
}
