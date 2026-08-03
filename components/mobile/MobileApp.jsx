"use client";

import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";
import React, { useState, useEffect } from "react";
import { IonApp, IonTabBar, IonTabButton, IonIcon, IonLabel } from "@ionic/react";
import { chatbubbleEllipses, cubeOutline, flagOutline } from "ionicons/icons";
import { Capacitor } from "@capacitor/core";
import ChatbotInterface from "@/components/ChatbotInterface";
import PluginStore from "@/components/chat/PluginStore";
import TargetsView from "@/components/modules/TargetsView";
import "./mobile-theme.css";

let pushRegistered = false;

async function setupPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.requestPermissions();
    await PushNotifications.register();
    PushNotifications.addListener("registration", (token) => {
      console.log("[Mobile] Push token:", token.value);
      fetch("/api/mobile/push-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.value }),
      }).catch(() => {});
    });
    PushNotifications.addListener("pushNotificationReceived", (n) => {
      console.log("[Mobile] Push received:", n);
    });
    PushNotifications.addListener("pushNotificationActionPerformed", (n) => {
      console.log("[Mobile] Push action:", n);
    });
  } catch (e) {
    console.warn("[Mobile] Push kurulumu atlandı:", e.message);
  }
}

function MobileApp() {
  const [activeTab, setActiveTab] = useState("chat");
  const [pluginStoreOpen, setPluginStoreOpen] = useState(false);

  useEffect(() => {
    if (!pushRegistered) {
      pushRegistered = true;
      setupPushNotifications();
    }
  }, []);

  return (
    <IonApp>
      <div className="mobile-shell">
        <main className="mobile-main">
          {activeTab === "chat" && (
            <ChatbotInterface key="chat" />
          )}
          {activeTab === "plugins" && (
            <div className="mobile-plugins">
              <PluginStore
                onClose={() => setActiveTab("chat")}
              />
            </div>
          )}
          {activeTab === "goals" && (
            <div className="mobile-goals">
              <TargetsView onSelectView={(v) => {}} />
            </div>
          )}
        </main>

        <IonTabBar slot="bottom" className="mobile-tabbar">
          <IonTabButton tab="chat" selected={activeTab === "chat"} onClick={() => setActiveTab("chat")}>
            <IonIcon icon={chatbubbleEllipses} />
            <IonLabel>Sohbet</IonLabel>
          </IonTabButton>
          <IonTabButton tab="plugins" selected={activeTab === "plugins"} onClick={() => setActiveTab("plugins")}>
            <IonIcon icon={cubeOutline} />
            <IonLabel>Eklentiler</IonLabel>
          </IonTabButton>
          <IonTabButton tab="goals" selected={activeTab === "goals"} onClick={() => setActiveTab("goals")}>
            <IonIcon icon={flagOutline} />
            <IonLabel>Hedefler</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </div>
    </IonApp>
  );
}

export default MobileApp;
