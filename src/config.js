@@
   bot: {
     count: 1,
@@
   },
+  border: {
+    margin: 0,            // px inside radius that counts as border touch; 0 = exact radius
+    timerSeconds: 5       // seconds before defeat while touching the border
+  },
+  spawn: {
+    attempts: 50          // attempts per bot at start to find a spawn position
+  },
+  victory: {
+    botWinPercent: 90     // percent coverage at which a bot wins
+  },
   colors: [
     "blue",
     "lime",
   ],
@@
   window.Empire = Empire;
