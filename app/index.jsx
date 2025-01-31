import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import * as Location from "expo-location";

const BASE_URL = "https://api.openweathermap.org/data/2.5";
const API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY;

const WeatherScreen = () => {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]); // ✅ Stores the 5-day forecast
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [city, setCity] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // ✅ Log `weather` state updates
  useEffect(() => {
    console.log("📢 Weather state updated:", weather);
  }, [weather]);

  // ✅ Get User's Location on Mount
  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      let userLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        maximumAge: 0,
      });

      console.log("📍 User's Location:", userLocation);
      setLocation(userLocation.coords);
    }

    getCurrentLocation();
  }, []);

  // ✅ Fetch Weather When Location Updates
  useEffect(() => {
    if (location && !isSearching) {
      fetchWeatherByCoords(location.latitude, location.longitude);
    }
  }, [location, isSearching]);

  // ✅ Fetch Weather By Coordinates (Current + 5-Day Forecast)
  const fetchWeatherByCoords = async (lat, lon) => {
    try {
      if (!API_KEY) {
        setErrorMsg("API key is missing or not loaded.");
        return;
      }

      console.log("🛜 Fetching current weather and 5-day forecast for:", lat, lon);

      const [weatherRes, forecastRes] = await Promise.all([
        fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
        fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
      ]);

      const weatherData = await weatherRes.json();
      const forecastData = await forecastRes.json();

      console.log("☀️ Current Weather Data:", JSON.stringify(weatherData));
      console.log("📅 5-Day Forecast Data:", JSON.stringify(forecastData));

      if (weatherData.cod !== 200 || forecastData.cod !== "200") {
        setErrorMsg("Error fetching weather data.");
        return;
      }

      setWeather(weatherData);
      setForecast(forecastData.list); // ✅ Stores the forecast

    } catch (error) {
      console.error("Error fetching weather data:", error);
      setErrorMsg("Failed to fetch weather data.");
    }
  };

  // ✅ Fetch Weather By City Name
  const fetchWeatherByCity = async () => {
    if (!city.trim()) {
      setErrorMsg("Please enter a city name.");
      return;
    }

    try {
      setIsSearching(true);
      console.log("🔍 Searching for weather in:", city);

      const [weatherRes, forecastRes] = await Promise.all([
        fetch(`${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`),
        fetch(`${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=metric`)
      ]);

      const weatherData = await weatherRes.json();
      const forecastData = await forecastRes.json();

      if (weatherData.cod !== 200 || forecastData.cod !== "200") {
        setErrorMsg("Error fetching weather data.");
        setWeather(null);
        setForecast([]);
        return;
      }

      console.log("☁️ Weather Data for City:", JSON.stringify(weatherData));
      console.log("📅 5-Day Forecast Data for City:", JSON.stringify(forecastData));

      setWeather(weatherData);
      setForecast(forecastData.list); // ✅ Stores the forecast
      setErrorMsg(null);
    } catch (error) {
      console.error("Error fetching weather data:", error);
      setErrorMsg("Failed to fetch weather data.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <TextInput
        style={styles.input}
        placeholder="Enter city name"
        value={city}
        onChangeText={(text) => setCity(text)}
      />
      <TouchableOpacity style={styles.searchButton} onPress={fetchWeatherByCity}>
        <Text style={styles.searchButtonText}>Search</Text>
      </TouchableOpacity>

      {/* Loading Indicator */}
      {!weather && !errorMsg && <ActivityIndicator size="large" color="red" />}

      {/* Current Weather Info */}
      {weather && (
        <>
          <Text style={styles.location}>📍 {weather.name}</Text>
          <Text style={styles.temp}>🌡️ {Math.round(weather.main.temp)}°C</Text>
          <Text>☁️ {weather.weather[0].description}</Text>
          <Text>💧 Humidity: {weather.main.humidity}%</Text>
          <Text>🌬️ Wind Speed: {weather.wind.speed} m/s</Text>
          <Text>🌅 Sunrise: {new Date(weather.sys.sunrise * 1000).toLocaleTimeString()}</Text>
          <Text>🌇 Sunset: {new Date(weather.sys.sunset * 1000).toLocaleTimeString()}</Text>
        </>
      )}

      {/* 5-Day Forecast */}
      {forecast.length > 0 && (
        <View style={styles.forecastContainer}>
          <Text style={styles.forecastTitle}>5-Day Forecast</Text>
          {forecast
            .filter((item, index) => index % 8 === 0) // ✅ Get one forecast per day
            .map((item, index) => (
              <View key={index} style={styles.forecastItem}>
                <Text style={styles.forecastDate}>
                  {new Date(item.dt * 1000).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric"
                  })}
                </Text>
                <Text style={styles.forecastTemp}>🌡️ {Math.round(item.main.temp)}°C</Text>
                <Text style={styles.forecastDesc}>☁️ {item.weather[0].description}</Text>
              </View>
            ))}
        </View>
      )}

      {/* Error Message */}
      {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  location: { fontSize: 34, fontWeight: "bold", marginBottom: 10 },
  temp: { fontSize: 40, fontWeight: "bold", marginBottom: 10 },
  input: {
    width: "90%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 18,
    marginBottom: 10,
  },
  searchButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginBottom: 20,
  },
  searchButtonText: {
    fontSize: 18,
    color: "white",
    fontWeight: "bold",
  },
  forecastContainer: {
    marginTop: 20,
    width: "90%",
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  forecastTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  forecastItem: { width: "100%", flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#ddd" },
  errorText: { fontSize: 20, color: "red" }
});

export default WeatherScreen;