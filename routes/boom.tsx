import { Head } from "$fresh/runtime.ts";

export default function Boom() {
  return (
    <>
      <Head>
        <title>💥 KABOOM! - QRBuddy</title>
        <meta
          name="description"
          content="This QR code has already self-destructed"
        />
        <meta name="robots" content="noindex" />
      </Head>

      <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-orange-400 via-red-400 to-yellow-400 relative overflow-hidden">
        {/* Emoji rain */}
        <div class="emoji-rain emoji-1 absolute text-4xl animate-fall">💥</div>
        <div class="emoji-rain emoji-2 absolute text-4xl animate-fall">🔥</div>
        <div class="emoji-rain emoji-3 absolute text-4xl animate-fall">💣</div>
        <div class="emoji-rain emoji-4 absolute text-4xl animate-fall">✨</div>
        <div class="emoji-rain emoji-5 absolute text-4xl animate-fall">💥</div>
        <div class="emoji-rain emoji-6 absolute text-4xl animate-fall">🎆</div>
        <div class="emoji-rain emoji-7 absolute text-4xl animate-fall">💢</div>
        <div class="emoji-rain emoji-8 absolute text-4xl animate-fall">🔥</div>
        <div class="emoji-rain emoji-9 absolute text-4xl animate-fall">💥</div>

        <div class="explosion-container max-w-2xl w-full animate-shake-once">
          <div class="bg-black border-8 border-yellow-300 rounded-3xl p-12 md:p-16 text-center shadow-[12px_12px_0_rgba(255,107,107,0.5),24px_24px_0_rgba(255,230,109,0.3)] animate-explode">
            {/* ASCII Explosion */}
            <pre class="font-mono text-2xl text-yellow-300 mb-8 animate-float whitespace-pre">
              {`     \\  |  /
      \\ | /
    -- BOOM --
      / | \\
     /  |  \\`}
            </pre>

            <h1 class="text-7xl md:text-8xl font-black text-yellow-300 mb-6 drop-shadow-[3px_3px_0_#FF6B6B]">
              KABOOM!
            </h1>

            <div class="text-3xl md:text-4xl text-white mb-8 font-bold">
              THIS FILE<br />
              ALREADY EXPLODED
            </div>

            <div class="bg-yellow-300 text-black p-6 rounded-2xl mb-8 border-4 border-black text-lg font-semibold">
              One-time use only.<br />
              Someone already grabbed it.<br />
              It's gone forever.
            </div>

            <div class="text-yellow-300 text-xl opacity-90">
              The ephemeral nature of digital existence
            </div>

            {/* Back to QRBuddy link */}
            <a
              href="/"
              class="inline-block mt-8 px-8 py-4 bg-yellow-300 text-black text-lg font-bold rounded-xl border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,0.3)] hover:scale-105 hover:shadow-[6px_6px_0_rgba(0,0,0,0.3)] transition-all"
            >
              ← Back to QRBuddy
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer class="mt-16 text-center text-black opacity-70">
          Made by Pablo • Melbourne
        </footer>
      </div>

      <style>
        {`
          @keyframes shake-once {
            0%, 100% { transform: translateX(0); }
            10% { transform: translateX(-10px) rotate(-1deg); }
            20% { transform: translateX(10px) rotate(1deg); }
            30% { transform: translateX(-8px) rotate(-0.5deg); }
            40% { transform: translateX(8px) rotate(0.5deg); }
            50% { transform: translateX(-5px); }
            60% { transform: translateX(5px); }
            70% { transform: translateX(-3px); }
            80% { transform: translateX(3px); }
            90% { transform: translateX(-1px); }
          }

          @keyframes explode {
            0% { transform: scale(0) rotate(0deg); opacity: 0; }
            20% { transform: scale(0.5) rotate(45deg); opacity: 1; }
            50% { transform: scale(1.2) rotate(90deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }

          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }

          @keyframes fall {
            to {
              transform: translateY(calc(100vh + 50px));
            }
          }

          .animate-shake-once {
            animation: shake-once 0.5s ease-out;
          }

          .animate-explode {
            animation: explode 0.6s ease-out;
          }

          .animate-float {
            animation: float 2s ease-in-out infinite;
          }

          .animate-fall {
            animation: fall linear infinite;
            will-change: transform;
          }

          /* Emoji rain positioning */
          .emoji-1 { left: 10%; animation-duration: 4s; }
          .emoji-2 { left: 20%; animation-duration: 4.5s; animation-delay: 0.5s; }
          .emoji-3 { left: 30%; animation-duration: 5s; animation-delay: 1s; }
          .emoji-4 { left: 40%; animation-duration: 4.2s; animation-delay: 1.5s; }
          .emoji-5 { left: 50%; animation-duration: 4.8s; animation-delay: 0.2s; }
          .emoji-6 { left: 60%; animation-duration: 4.3s; animation-delay: 0.8s; }
          .emoji-7 { left: 70%; animation-duration: 5.2s; animation-delay: 1.2s; }
          .emoji-8 { left: 80%; animation-duration: 4.6s; animation-delay: 0.3s; }
          .emoji-9 { left: 90%; animation-duration: 4.9s; animation-delay: 0.7s; }
        `}
      </style>
    </>
  );
}
