// navigation/index.tsx
import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

/* Auth */
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";

/* Citizen screens */
import HomeScreen from "../screens/HomeScreen";
import ServicesScreen from "../screens/ServicesScreen";
import IncidentReportScreen from "../screens/IncidentReportScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import AnnouncementsScreen from "../screens/AnnouncementsScreen";
import AnnouncementDetailScreen from "../screens/AnnouncementDetailScreen";
import ProfileScreen from "../screens/ProfileScreen";
import IncidentStatusScreen from "../screens/IncidentStatusScreen";
import SOSHotlinesScreen from "../screens/SOSHotlinesScreen";
import SettingsLanguageScreen from "../screens/SettingsLanguageScreen";
import AlertsScreen from "../screens/AlertsScreen";
import AlertDetailScreen from "../screens/AlertDetailScreen";
import AlertSettingsScreen from "../screens/AlertSettingsScreen";
import BookAppointmentScreen from "../screens/BookAppointmentScreen";
import AppointmentSuccessScreen from "../screens/AppointmentSuccessScreen";
import MyAppointmentsScreen from "../screens/MyAppointmentsScreen";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  Home: undefined;
  IncidentReport: undefined;
  Notifications: undefined;
  Announcements: undefined;
  AnnouncementDetail: { announcementId: string };
  Profile: undefined;
  IncidentStatus: { incidentId?: string; notificationId?: string } | undefined;
  SOSHotlines: undefined;
  SettingsLanguage: undefined;
  Alerts: undefined;
  AlertDetail: { id: string; alert?: any } | undefined;
  AlertSettings: undefined;
  BookAppointment: undefined;
  AppointmentSuccess: undefined;
  MyAppointments: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#dc2626",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Services"
        component={ServicesScreen}
        options={{
          tabBarLabel: "Services",
          tabBarIcon: ({ color, size }) => <Ionicons name="apps-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="News"
        component={AnnouncementsScreen}
        options={{
          tabBarLabel: "News",
          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Emergency"
        component={AlertsScreen}
        options={{
          tabBarLabel: "Emergency",
          tabBarIcon: ({ color, size }) => <Ionicons name="warning-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Account"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Account",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function MainAppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="MainTabs">
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="IncidentReport" component={IncidentReportScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
      <Stack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="IncidentStatus" component={IncidentStatusScreen} />
      <Stack.Screen name="SOSHotlines" component={SOSHotlinesScreen} />
      <Stack.Screen name="SettingsLanguage" component={SettingsLanguageScreen} />
      <Stack.Screen name="Alerts" component={AlertsScreen} />
      <Stack.Screen name="AlertDetail" component={AlertDetailScreen} />
      <Stack.Screen name="AlertSettings" component={AlertSettingsScreen} />
      <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
      <Stack.Screen name="AppointmentSuccess" component={AppointmentSuccessScreen} />
      <Stack.Screen name="MyAppointments" component={MyAppointmentsScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigation() {
  const { isLoading } = useContext(AuthContext);
  if (isLoading) return null;

  return <MainAppStack />;
}
