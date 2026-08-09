@@
   start(name) {
@@
     for (let i = 0; i < this.config.bot.count; i += 1) {
       this.addBot();
     }
+
+    // Start asynchronous bot thinking loop so AI decisions don't block frames
+    if (Empire.model && Empire.model.bots && typeof Empire.model.bots.scheduleThinking === 'function') {
+      Empire.model.bots.scheduleThinking(this.bots, this);
+    }
   }
*** End Patch
