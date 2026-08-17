import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { getInternOnboarding } from "@/lib/onboarding/data";
import { DOCUMENT_REQUIREMENTS, ORIENTATION_TOPICS } from "@/lib/onboarding/domain";

export const dynamic = "force-dynamic";
type Data = NonNullable<Awaited<ReturnType<typeof getInternOnboarding>>>;
type Requirement = (typeof DOCUMENT_REQUIREMENTS)[number];

export default async function OnboardingPage() {
  const user = await requireCurrentUser();
  if (user.role !== "INTERN") notFound();
  const data = await getInternOnboarding(user.id);
  if (!data) return <main className="operational-page"><section className="ui-card p-6"><h1>Getting started</h1><p>Your onboarding details will be available after your internship is configured.</p><Link href="/dashboard" className="button button-primary mt-5">Go to Dashboard</Link></section></main>;

  const { counts } = data;
  const required = DOCUMENT_REQUIREMENTS.filter((item) => item.required);
  const optional = DOCUMENT_REQUIREMENTS.filter((item) => !item.required);
  const missing = required.filter((item) => !data.documents[item.key]);
  const documentComplete = required.length - missing.length;
  const nextActions: Array<{ title: string; body: string; href: string; label: string }> = [];
  if (!data.profileComplete) nextActions.push({ title: "Complete your profile", body: "Add your contact and emergency information.", href: "/profile/edit", label: "Complete profile" });
  for (const item of missing) nextActions.push({ title: `Upload ${item.title}`, body: item.description, href: uploadHref(item), label: "Upload" });

  return <main className="operational-page onboarding-page">
    <section className="onboarding-hero">
      <div className="onboarding-hero-copy"><span className="onboarding-welcome-mark" aria-hidden="true">IT</span><p className="eyebrow">Your IntelliTrack journey</p><h1>Welcome aboard, {data.profile.user.firstName}</h1><p>Set up your internship workspace at your own pace. Your Dashboard and daily tools are always available while you finish.</p><div className="onboarding-hero-actions">{!counts.done ? <a href="#up-next" className="button button-primary">Continue setup</a> : null}<Link href="/dashboard" className="button button-secondary">Go to Dashboard</Link></div></div>
      <div className="onboarding-progress-spotlight"><div className="onboarding-progress-ring" style={{ "--onboarding-progress": `${counts.percentage * 3.6}deg` } as React.CSSProperties}><span><strong>{counts.percentage}%</strong><small>complete</small></span></div><p><strong>{counts.complete} of {counts.required}</strong> required items ready</p><progress max={100} value={counts.percentage}>{counts.percentage}%</progress><small>{counts.done ? "Your required setup is complete" : `${counts.yourAction} next action${counts.yourAction === 1 ? "" : "s"} to finish`}</small></div>
    </section>

    {counts.done ? <section className="onboarding-complete"><span aria-hidden="true">✓</span><div><p className="eyebrow">Onboarding complete</p><h2>You&apos;re all set, {data.profile.user.firstName}.</h2><p>Your required internship setup is complete. Keep using IntelliTrack to manage your internship.</p><Link href="/dashboard" className="button button-primary">Go to Dashboard</Link></div></section> : null}

    <Journey accountComplete={data.profileComplete} documentsComplete={documentComplete} done={counts.done} />

    <div className="onboarding-layout"><div className="onboarding-main">
      {!counts.done ? <UpNext actions={nextActions.slice(0, 3)} /> : null}

      <section className="onboarding-section onboarding-requirements"><header><div><p className="eyebrow">Requirements</p><h2>Your document checklist</h2><p>You submit each requirement here. Issuer information helps you identify which document to request or prepare.</p></div><span>{documentComplete} of {required.length} ready</span></header><div className="onboarding-list">{required.map((item) => <DocumentRow key={item.key} requirement={item} data={data} userId={user.id} />)}</div><div className="onboarding-optional"><h3>Optional documents</h3>{optional.map((item) => <DocumentRow key={item.key} requirement={item} data={data} userId={user.id} />)}</div></section>

      <section className="onboarding-section onboarding-account"><header><p className="eyebrow">Account</p><h2>Account setup</h2></header><div className="onboarding-list"><SimpleRow title="Password changed" status="Complete" /><SimpleRow title="Complete profile" status={data.profileComplete ? "Complete" : "Needs your action"} action={!data.profileComplete ? <Link href="/profile/edit">Complete profile</Link> : undefined} /><SimpleRow title="Profile photo" status={data.profile.user.profilePhotoPath ? "Complete" : "Optional"} action={!data.profile.user.profilePhotoPath ? <Link href="/profile/edit">Add photo</Link> : undefined} /></div></section>

      <section className="onboarding-guides"><header><p className="eyebrow">Quick guides</p><h2>Learn the essentials</h2><p>Explore these anytime. Guides are optional and never affect your progress.</p></header><div>{ORIENTATION_TOPICS.map((guide, index) => <article key={guide.id}><span aria-hidden="true">{index + 1}</span><div><h3>{guide.title}</h3><p>{guide.body}</p><Link href={guide.href}>Open guide</Link></div></article>)}</div></section>
    </div><Context data={data} /></div>
  </main>;
}

function uploadHref(item: Requirement) { return `/documents/new?title=${encodeURIComponent(item.title)}&category=${item.category}`; }

function Journey({ accountComplete, documentsComplete, done }: { accountComplete: boolean; documentsComplete: number; done: boolean }) {
  return <section className="onboarding-journey" aria-labelledby="journey-title"><div><p className="eyebrow" id="journey-title">Your journey</p><h2>Three steps to get ready</h2></div><ol><li className={accountComplete ? "is-complete" : "is-current"}><span>{accountComplete ? "✓" : "1"}</span><div><strong>Account</strong><small>{accountComplete ? "Complete" : "Complete your profile"}</small></div></li><li className={!accountComplete ? "" : done ? "is-complete" : "is-current"}><span>{done ? "✓" : "2"}</span><div><strong>Requirements</strong><small>{documentsComplete} of 5 documents ready</small></div></li><li className={done ? "is-complete" : ""}><span>{done ? "✓" : "3"}</span><div><strong>Ready</strong><small>{done ? "Complete" : "Finish required setup"}</small></div></li></ol></section>;
}

function UpNext({ actions }: { actions: Array<{ title: string; body: string; href: string; label: string }> }) {
  return <section className="onboarding-section onboarding-up-next" id="up-next"><header><div><p className="eyebrow">Up next</p><h2>Keep your momentum going</h2><p>Start with one of these next actions.</p></div><span>{actions.length} suggested</span></header><div className="onboarding-next-grid">{actions.map((action, index) => <article key={action.href}><span aria-hidden="true">{index + 1}</span><div><h3>{action.title}</h3><p>{action.body}</p></div><Link href={action.href} className="button button-secondary">{action.label}</Link></article>)}</div></section>;
}

function SimpleRow({ title, status, action }: { title: string; status: string; action?: React.ReactNode }) { const done = status === "Complete"; return <div className="onboarding-item"><span className={done ? "onboarding-check is-complete" : "onboarding-check"}>{done ? "✓" : "○"}</span><strong>{title}</strong><StatusBadge tone={done ? "success" : "neutral"}>{status}</StatusBadge>{action ? <div>{action}</div> : null}</div>; }

function DocumentRow({ requirement, data, userId }: { requirement: Requirement; data: Data; userId: string }) {
  const document = data.documents[requirement.key];
  const status = document ? "Complete" : requirement.required ? "Needs your action" : "Optional";
  return <div className="onboarding-item onboarding-document"><span className={document ? "onboarding-document-icon is-complete" : "onboarding-document-icon"} aria-hidden="true">{document ? "✓" : "↥"}</span><span><strong>{requirement.title}</strong><small>{requirement.description}</small><em>{requirement.issuer === "You" ? "Prepared by you" : `Issued by ${requirement.issuer}`}</em>{document ? <small>{document.originalFileName}</small> : null}</span><StatusBadge tone={document ? "success" : "neutral"}>{status}</StatusBadge><div className="onboarding-actions">{document ? <><Link href={`/documents/${document.id}`}>View</Link>{document.uploadedById === userId ? <Link href={`/documents/${document.id}/edit`}>Replace</Link> : null}</> : <Link href={uploadHref(requirement)}>Upload</Link>}</div></div>;
}

function Context({ data }: { data: Data }) { const { counts } = data; return <aside className="onboarding-context"><div className="onboarding-context-progress"><span>{counts.percentage}%</span><div><strong>Your progress</strong><small>{counts.complete} of {counts.required} required items</small></div></div><p>{counts.done ? "Required setup complete" : `${counts.yourAction} item${counts.yourAction === 1 ? "" : "s"} left to complete`}</p><p className="eyebrow onboarding-context-heading">Your internship</p><dl><Fact label="Role" value={data.assignment.positionTitle ?? `${data.profile.course} Intern`} /><Fact label="Company" value={data.assignment.company.name} /><Fact label="School" value={data.profile.school.name} /><Fact label="Supervisor" value={`${data.assignment.supervisorProfile.user.firstName} ${data.assignment.supervisorProfile.user.lastName}`} /><Fact label="Required hours" value={data.assignment.requiredHours ? `${data.assignment.requiredHours} h` : "Not specified"} /></dl><Link href="/dashboard" className="onboarding-context-dashboard">Go to Dashboard</Link></aside>; }
function Fact({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
