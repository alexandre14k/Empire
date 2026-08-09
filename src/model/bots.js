@@
   // Async think tick for bots — updates thinkTarget without blocking main loop
-  static scheduleThinking(bots, model) {
-    if (typeof requestIdleCallback === 'function') {
-      requestIdleCallback(() => BotsHelper.think(bots, model), { timeout: 60 });
-    } else {
-      setTimeout(() => BotsHelper.think(bots, model), 20);
-    }
-  }
+  static scheduleThinking(bots, model) {
+    // start a continuous non-blocking thinking loop
+    const run = () => {
+      try {
+        BotsHelper.think(bots, model);
+      } catch (err) {
+        // swallow errors from AI so we don't stop the loop
+        console.error('bot think error', err);
+      }
+      if (typeof requestIdleCallback === 'function') {
+        requestIdleCallback(run, { timeout: 80 });
+      } else {
+        setTimeout(run, 80);
+      }
+    };
+
+    // kick off the loop
+    if (typeof requestIdleCallback === 'function') {
+      requestIdleCallback(run, { timeout: 80 });
+    } else {
+      setTimeout(run, 80);
+    }
+  }
*** End Patch
