import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Streka - One slash a day. Keep the streak.',
  description:
    'Streka is a free fitness tracker for people building a habit, not chasing a podium. Log a workout, a run, a meal, the day counts. Works offline.',
};

export default function Home() {
  return (
    <>
      {/* ============ HERO (green) ============ */}
      <div style={{ background: '#17c25f', color: '#0b1c10' }}>
        {/* nav */}
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '22px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="26" height="26" viewBox="0 0 46 46">
              <rect x="16" y="-8" width="14" height="62" rx="7" fill="#0b1c10" transform="rotate(32 23 23)" />
            </svg>
            <span style={{ font: '900 italic 24px \'Archivo\'', letterSpacing: '-.03em' }}>STREKA</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '26px' }}>
            <a href="#features" style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(11,28,16,.75)', textDecoration: 'none' }}>
              Features
            </a>
            <a href="#web" style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(11,28,16,.75)', textDecoration: 'none' }}>
              Web app
            </a>
            <a
              href="#get"
              style={{
                fontSize: '13.5px',
                fontWeight: '900',
                color: '#fff',
                background: '#0b1c10',
                padding: '11px 20px',
                borderRadius: '12px',
                textDecoration: 'none',
              }}
            >
              Get the app
            </a>
          </div>
        </div>
        {/* hero body */}
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '40px 28px 0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '48px',
          }}
        >
          <div style={{ flex: '1', minWidth: '320px', maxWidth: '640px', paddingBottom: '64px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(11,28,16,.1)',
                borderRadius: '999px',
                padding: '7px 14px',
                fontSize: '12.5px',
                fontWeight: '800',
                letterSpacing: '.06em',
              }}
            >
              FREE · iOS · ANDROID · WEB
            </div>
            <h1
              style={{
                font: '900 italic clamp(52px,7.5vw,92px)/0.95 \'Archivo\'',
                letterSpacing: '-.04em',
                margin: '22px 0 0',
              }}
            >
              ONE SLASH
              <br />
              A DAY.
            </h1>
            <p
              style={{
                fontSize: 'clamp(16px,1.6vw,19px)',
                fontWeight: '600',
                lineHeight: '1.55',
                color: 'rgba(11,28,16,.75)',
                margin: '22px 0 0',
                maxWidth: '520px',
                textWrap: 'pretty',
              }}
            >
              Streka is a fitness tracker for people building a habit, not chasing a podium. Log a workout, a run, a
              meal, the day counts. Works with no signal, syncs when you&apos;re back.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '30px' }}>
              {/* Store badges are placeholders; production uses official Apple/Google badge art. */}
              <a
                href="#get"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  background: '#0b1c10',
                  color: '#fff',
                  borderRadius: '14px',
                  padding: '11px 22px',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '10.5px', fontWeight: '600', opacity: '.7', letterSpacing: '.04em' }}>
                  DOWNLOAD ON THE
                </span>
                <span style={{ fontSize: '17px', fontWeight: '900' }}>App Store</span>
              </a>
              <a
                href="#get"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  background: '#0b1c10',
                  color: '#fff',
                  borderRadius: '14px',
                  padding: '11px 22px',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '10.5px', fontWeight: '600', opacity: '.7', letterSpacing: '.04em' }}>
                  GET IT ON
                </span>
                <span style={{ fontSize: '17px', fontWeight: '900' }}>Google Play</span>
              </a>
              <a
                href="#web"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'transparent',
                  border: '2px solid rgba(11,28,16,.35)',
                  color: '#0b1c10',
                  borderRadius: '14px',
                  padding: '11px 22px',
                  textDecoration: 'none',
                  fontSize: '15px',
                  fontWeight: '900',
                }}
              >
                Open web app
              </a>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '26px',
                fontSize: '13px',
                fontWeight: '700',
                color: 'rgba(11,28,16,.6)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 46 46">
                <rect x="16" y="-8" width="14" height="62" rx="7" fill="#0b1c10" transform="rotate(32 23 23)" />
              </svg>
              No account needed to start. No ads. Free.
            </div>
          </div>
          {/* phone: day-12 board */}
          <div style={{ flex: 'none', width: '340px', height: '560px', overflow: 'hidden', margin: '0 auto' }}>
            <div style={{ transform: 'scale(.845)', transformOrigin: 'top center', width: '402px', marginLeft: '-31px' }}>
              <div
                style={{
                  width: '402px',
                  height: '874px',
                  borderRadius: '48px',
                  overflow: 'hidden',
                  position: 'relative',
                  background: '#131712',
                  boxShadow: '0 50px 100px rgba(11,28,16,.35),0 0 0 1px rgba(11,28,16,.2)',
                  color: '#fff',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '11px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '126px',
                    height: '37px',
                    borderRadius: '24px',
                    background: '#000',
                    zIndex: '5',
                  }}
                />
                <div style={{ padding: '70px 18px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="20" height="20" viewBox="0 0 46 46">
                          <rect x="16" y="-8" width="14" height="62" rx="7" fill="#17c25f" transform="rotate(32 23 23)" />
                        </svg>
                        <div style={{ font: '900 italic 25px \'Archivo\'', letterSpacing: '-.03em', lineHeight: '1' }}>
                          STREKA
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          letterSpacing: '.08em',
                          textTransform: 'uppercase',
                          color: '#8a938a',
                          marginTop: '6px',
                        }}
                      >
                        Thu, Jul 2
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(23,194,95,.15)',
                        borderRadius: '999px',
                        padding: '5px 11px',
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 46 46">
                        <rect x="16" y="-8" width="14" height="62" rx="7" fill="#3fe07f" transform="rotate(32 23 23)" />
                      </svg>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#3fe07f' }}>12</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div
                      style={{
                        gridColumn: '1 / -1',
                        background: '#1d231c',
                        borderRadius: '20px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            letterSpacing: '.06em',
                            textTransform: 'uppercase',
                            color: '#8a938a',
                          }}
                        >
                          Steps · auto
                        </div>
                        <div style={{ fontSize: '38px', fontWeight: '900', letterSpacing: '-.03em', lineHeight: '1.1' }}>
                          8,246
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#3fe07f' }}>72% of 11,500</div>
                        <div
                          style={{
                            marginTop: '8px',
                            width: '110px',
                            height: '7px',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,.12)',
                          }}
                        >
                          <div style={{ width: '72%', height: '100%', borderRadius: '4px', background: '#17c25f' }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ background: '#17c25f', borderRadius: '20px', padding: '16px', color: '#0b1c10' }}>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          letterSpacing: '.06em',
                          textTransform: 'uppercase',
                          opacity: '.65',
                        }}
                      >
                        Workout
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '900', marginTop: '2px', lineHeight: '1.1' }}>
                        Logged ✓
                      </div>
                      <div style={{ fontSize: '11.5px', fontWeight: '600', marginTop: '2px', opacity: '.7' }}>
                        Upper body · 45 min
                      </div>
                      <div style={{ marginTop: '12px', fontSize: '11px', fontWeight: '800', letterSpacing: '.04em' }}>
                        STREAK 12
                      </div>
                    </div>
                    <div style={{ background: '#1d231c', borderRadius: '20px', padding: '16px', position: 'relative' }}>
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '15px',
                          color: '#3fe07f',
                        }}
                      >
                        +
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          letterSpacing: '.06em',
                          textTransform: 'uppercase',
                          color: '#8a938a',
                        }}
                      >
                        Meals
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '900', marginTop: '2px', lineHeight: '1.1' }}>
                        1,430
                      </div>
                      <div style={{ fontSize: '11.5px', fontWeight: '600', marginTop: '2px', color: '#8a938a' }}>
                        of 2,200 kcal
                      </div>
                      <div
                        style={{
                          marginTop: '12px',
                          height: '6px',
                          borderRadius: '3px',
                          background: 'rgba(255,255,255,.1)',
                        }}
                      >
                        <div style={{ width: '65%', height: '100%', borderRadius: '3px', background: '#17c25f' }} />
                      </div>
                    </div>
                    <div style={{ background: '#1d231c', borderRadius: '20px', padding: '16px', position: 'relative' }}>
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '15px',
                          color: '#3fe07f',
                        }}
                      >
                        +
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          letterSpacing: '.06em',
                          textTransform: 'uppercase',
                          color: '#8a938a',
                        }}
                      >
                        Run
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '900', marginTop: '2px', lineHeight: '1.1' }}>
                        4.2 km
                      </div>
                      <div style={{ fontSize: '11.5px', fontWeight: '600', marginTop: '2px', color: '#8a938a' }}>
                        this morning · GPS
                      </div>
                      <div
                        style={{
                          marginTop: '12px',
                          fontSize: '11px',
                          fontWeight: '800',
                          letterSpacing: '.04em',
                          color: '#3fe07f',
                        }}
                      >
                        STREAK 5
                      </div>
                    </div>
                    <div style={{ background: '#1d231c', borderRadius: '20px', padding: '16px' }}>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          letterSpacing: '.06em',
                          textTransform: 'uppercase',
                          color: '#8a938a',
                        }}
                      >
                        Weight
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '900', marginTop: '2px', lineHeight: '1.1' }}>
                        72.4 kg
                      </div>
                      <div style={{ fontSize: '11.5px', fontWeight: '600', marginTop: '2px', color: '#3fe07f' }}>
                        ▾ 0.3 this week
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ FEATURES ============ */}
      <div id="features" style={{ maxWidth: '1200px', margin: '0 auto', padding: '72px 28px 8px' }}>
        <h2
          style={{
            font: '900 clamp(30px,3.6vw,44px)/1.05 \'Archivo\'',
            letterSpacing: '-.03em',
            margin: '0',
            maxWidth: '640px',
          }}
        >
          Built for keeping up,
          <br />
          not keeping score.
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
            gap: '16px',
            marginTop: '36px',
          }}
        >
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: '22px', padding: '26px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: '#17c25f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 22 22">
                <path d="M11 3v16M3 11h16" stroke="#0b1c10" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
            </div>
            <h3 style={{ font: '900 21px \'Archivo\'', letterSpacing: '-.02em', margin: '18px 0 8px' }}>Tap. Logged.</h3>
            <p
              style={{
                fontSize: '14.5px',
                fontWeight: '500',
                lineHeight: '1.6',
                color: 'rgba(19,23,18,.65)',
                margin: '0',
                textWrap: 'pretty',
              }}
            >
              The home screen is the logger. Every tracker is a tile, one tap logs it, no menus, no forms. Workouts,
              runs, swims, meals, weight, classes.
            </p>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: '22px', padding: '26px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: '#131712',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: '3.5px solid #17c25f',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <h3 style={{ font: '900 21px \'Archivo\'', letterSpacing: '-.02em', margin: '18px 0 8px' }}>
              Offline isn&apos;t an edge case
            </h3>
            <p
              style={{
                fontSize: '14.5px',
                fontWeight: '500',
                lineHeight: '1.6',
                color: 'rgba(19,23,18,.65)',
                margin: '0',
                textWrap: 'pretty',
              }}
            >
              Basement gym, trail, airplane, everything works with no signal and syncs silently when you&apos;re back.
              You&apos;ll never see a spinner between you and a log.
            </p>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: '22px', padding: '26px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: '#17c25f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 46 46">
                <rect x="16" y="-8" width="14" height="62" rx="7" fill="#0b1c10" transform="rotate(32 23 23)" />
              </svg>
            </div>
            <h3 style={{ font: '900 21px \'Archivo\'', letterSpacing: '-.02em', margin: '18px 0 8px' }}>
              One slash a day
            </h3>
            <p
              style={{
                fontSize: '14.5px',
                fontWeight: '500',
                lineHeight: '1.6',
                color: 'rgba(19,23,18,.65)',
                margin: '0',
                textWrap: 'pretty',
              }}
            >
              Log anything, a workout, a meal, a swim, and the day counts. The streak grows one slash at a time; your
              weekly rhythm goal keeps the target kind.
            </p>
          </div>
        </div>
        {/* watch strip */}
        <div
          style={{
            background: '#131712',
            color: '#fff',
            borderRadius: '22px',
            padding: '30px',
            marginTop: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div style={{ flex: '1', minWidth: '280px' }}>
            <h3 style={{ font: '900 21px \'Archivo\'', letterSpacing: '-.02em', margin: '0 0 8px' }}>
              Your watch does the boring logging
            </h3>
            <p
              style={{
                fontSize: '14.5px',
                fontWeight: '500',
                lineHeight: '1.6',
                color: 'rgba(255,255,255,.6)',
                margin: '0',
                maxWidth: '560px',
                textWrap: 'pretty',
              }}
            >
              Steps and sleep fill in automatically from Apple Health or Health Connect. No watch? Everything works
              with manual logging, that&apos;s what the big tiles are for.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '24px', flex: 'none' }}>
            <div>
              <div style={{ fontSize: '30px', fontWeight: '900', color: '#3fe07f' }}>auto</div>
              <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'rgba(255,255,255,.5)' }}>steps &amp; sleep</div>
            </div>
            <div>
              <div style={{ fontSize: '30px', fontWeight: '900', color: '#3fe07f' }}>manual</div>
              <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'rgba(255,255,255,.5)' }}>
                always a fallback
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ WEB APP ============ */}
      <div id="web" style={{ maxWidth: '1200px', margin: '0 auto', padding: '64px 28px 8px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '40px' }}>
          <div style={{ flex: '1', minWidth: '300px', maxWidth: '480px' }}>
            <h2 style={{ font: '900 clamp(28px,3.2vw,38px)/1.1 \'Archivo\'', letterSpacing: '-.03em', margin: '0' }}>
              Your streak,
              <br />
              on any screen.
            </h2>
            <p
              style={{
                fontSize: '15px',
                fontWeight: '500',
                lineHeight: '1.6',
                color: 'rgba(19,23,18,.65)',
                margin: '16px 0 0',
                textWrap: 'pretty',
              }}
            >
              A free account syncs everything to the web app, full dashboard on your computer, the same one-tap board
              on your phone&apos;s browser. Phone data flows in; nothing to export.
            </p>
          </div>
          <div
            style={{
              flex: '1.4',
              minWidth: '320px',
              background: '#fff',
              border: '1px solid rgba(0,0,0,.08)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(19,23,18,.12)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderBottom: '1px solid rgba(0,0,0,.06)',
                background: '#fafbf9',
              }}
            >
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#e0e4de' }} />
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#e0e4de' }} />
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#e0e4de' }} />
              <div
                style={{
                  flex: '1',
                  marginLeft: '10px',
                  background: '#eef0ec',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  color: 'rgba(0,0,0,.4)',
                }}
              >
                app.streka.fit / board
              </div>
            </div>
            <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 46 46">
                    <rect x="16" y="-8" width="14" height="62" rx="7" fill="#131712" transform="rotate(32 23 23)" />
                  </svg>
                  <span style={{ font: '900 italic 17px \'Archivo\'', letterSpacing: '-.03em' }}>STREKA</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: '#6b736b' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#17c25f' }} />
                  Synced · just now
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: '10px' }}>
                <div style={{ background: '#f5f7f3', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '900' }}>12</div>
                  <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#6b736b' }}>day streak</div>
                </div>
                <div style={{ background: '#f5f7f3', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '900' }}>1,430</div>
                  <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#6b736b' }}>kcal today</div>
                </div>
                <div style={{ background: '#f5f7f3', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '900' }}>
                    5<span style={{ fontSize: '14px', color: '#6b736b' }}> / 7</span>
                  </div>
                  <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#6b736b' }}>active days</div>
                </div>
                <div style={{ background: '#f5f7f3', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '900' }}>72.4</div>
                  <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#6b736b' }}>kg · ▾ 0.3</div>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '5px',
                  alignItems: 'flex-end',
                  height: '56px',
                  background: '#f5f7f3',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ flex: '1', height: '60%', borderRadius: '4px', background: '#17c25f' }} />
                <div style={{ flex: '1', height: '85%', borderRadius: '4px', background: '#17c25f' }} />
                <div style={{ flex: '1', height: '20%', borderRadius: '4px', background: '#e0e4de' }} />
                <div style={{ flex: '1', height: '70%', borderRadius: '4px', background: '#17c25f' }} />
                <div style={{ flex: '1', height: '95%', borderRadius: '4px', background: '#17c25f' }} />
                <div style={{ flex: '1', height: '50%', borderRadius: '4px', background: '#17c25f' }} />
                <div style={{ flex: '1', height: '20%', borderRadius: '4px', background: '#e0e4de' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ CTA ============ */}
      <div id="get" style={{ maxWidth: '1200px', margin: '64px auto 0', padding: '0 28px 72px' }}>
        <div
          style={{
            background: '#17c25f',
            borderRadius: '28px',
            padding: 'clamp(36px,5vw,64px)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '28px',
            color: '#0b1c10',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="40" height="40" viewBox="0 0 46 46">
                <rect x="16" y="-8" width="14" height="62" rx="7" fill="#0b1c10" transform="rotate(32 23 23)" />
              </svg>
              <span style={{ font: '900 italic clamp(30px,4vw,44px) \'Archivo\'', letterSpacing: '-.03em' }}>
                KEEP THE STREAK.
              </span>
            </div>
            <p style={{ fontSize: '15px', fontWeight: '700', margin: '10px 0 0', color: 'rgba(11,28,16,.7)' }}>
              Free. No ads. Day 1 is one tap away.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <a
              href="#"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: '#0b1c10',
                color: '#fff',
                borderRadius: '14px',
                padding: '12px 24px',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: '10.5px', fontWeight: '600', opacity: '.7', letterSpacing: '.04em' }}>
                DOWNLOAD ON THE
              </span>
              <span style={{ fontSize: '17px', fontWeight: '900' }}>App Store</span>
            </a>
            <a
              href="#"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: '#0b1c10',
                color: '#fff',
                borderRadius: '14px',
                padding: '12px 24px',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: '10.5px', fontWeight: '600', opacity: '.7', letterSpacing: '.04em' }}>
                GET IT ON
              </span>
              <span style={{ fontSize: '17px', fontWeight: '900' }}>Google Play</span>
            </a>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            padding: '28px 6px 0',
            fontSize: '12.5px',
            fontWeight: '600',
            color: 'rgba(19,23,18,.45)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 46 46">
              <rect x="16" y="-8" width="14" height="62" rx="7" fill="rgba(19,23,18,.45)" transform="rotate(32 23 23)" />
            </svg>
            © 2026 Streka
          </div>
          <div style={{ display: 'flex', gap: '22px' }}>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>
              Privacy
            </a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>
              Terms
            </a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>
              Contact
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
