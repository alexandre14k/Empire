@@
   steerBot(bot) {
-    // If bot has an async think target (strike/escape), follow it first
-    if (bot.thinkTarget) {
-      const t = bot.thinkTarget;
-      bot.angle = M.atan2(t.y - bot.y, t.x - bot.x);
-      return;
-    }
-
-    const edge = this.distanceFromCenter(bot);
+    // If bot has an async think target (strike/escape/conquer/challenge), follow it first
+    if (bot.thinkTarget) {
+      const t = bot.thinkTarget;
+      const desired = M.atan2(t.y - bot.y, t.x - bot.x);
+      // smooth turning: interpolate angle with angular cap to avoid zig-zag
+      const diff = ((desired - bot.angle + Math.PI) % (Math.PI * 2)) - Math.PI;
+      const maxTurn = 0.35; // radians per tick
+      const turn = Math.max(-maxTurn, Math.min(maxTurn, diff * 0.9));
+      bot.angle = bot.angle + turn;
+      return;
+    }
+
+    const edge = this.distanceFromCenter(bot);
*** End Patch
