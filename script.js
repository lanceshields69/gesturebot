import { Hands, Camera } from "@mediapipe/hands"
import { drawConnectors, drawLandmarks, HAND_CONNECTIONS } from "@mediapipe/drawing_utils"

class VisualAIAssistant {
  constructor() {
    this.video = document.getElementById("video")
    this.canvas = document.getElementById("gestureCanvas")
    this.ctx = this.canvas.getContext("2d")
    this.responseElement = document.getElementById("responseContent")
    this.aiResponse = document.getElementById("aiResponse")
    this.startButton = document.getElementById("startButton")

    this.isActive = false
    this.lastGesture = null
    this.gestureTimeout = null
    this.currentMood = "neutral"
    this.hands = null
    this.camera = null
    this.lastHandX = 0

    this.responses = {
      wave: ["👋", "🤗", "😊", "✨"],
      thumbsUp: ["😄", "🎉", "⭐", "💫", "🌟"],
      thumbsDown: ["😔", "💔", "😢", "🌧️"],
      openHand: ["🤔", "❓", "🧐", "💭"],
      closedFist: ["💪", "🔥", "⚡", "🚀"],
      peace: ["☮️", "🕊️", "🌈", "💝", "🦄"],
      neutral: ["🤖", "👁️", "🔮", "✨"],
    }

    this.setupEventListeners()
  }

  setupEventListeners() {
    this.startButton.addEventListener("click", () => this.initCamera())

    // Add click interactions for demo
    document.querySelectorAll(".gesture-item").forEach((item) => {
      item.addEventListener("click", () => {
        const gesture = item.getAttribute("data-gesture")
        this.processGesture(gesture)
      })
    })
  }

  async initCamera() {
    try {
      this.startButton.classList.add("hidden")

      // Initialize MediaPipe Hands
      this.hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        },
      })

      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })

      this.hands.onResults((results) => this.onHandResults(results))

      // Initialize camera
      this.camera = new Camera(this.video, {
        onFrame: async () => {
          await this.hands.send({ image: this.video })
        },
        width: 640,
        height: 480,
      })

      await this.camera.start()

      // Set canvas dimensions
      this.canvas.width = this.video.videoWidth
      this.canvas.height = this.video.videoHeight
      this.isActive = true
    } catch (err) {
      console.error("Camera access denied or MediaPipe error:", err)
      alert("Could not access the camera. Please ensure you have granted camera permissions.")
    }
  }

  onHandResults(results) {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      // Draw hand landmarks
      for (const landmarks of results.multiHandLandmarks) {
        drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {
          color: "white",
          lineWidth: 3,
        })
        drawLandmarks(this.ctx, landmarks, {
          color: "rgba(255, 0, 0, 0.8)",
          lineWidth: 1,
          radius: 3,
        })
      }

      // Detect gestures
      this.detectGesture(results.multiHandLandmarks[0])
    }
  }

  detectGesture(landmarks) {
    if (!landmarks) return

    // Thumb tip is landmark 4
    const thumbTip = landmarks[4]
    // Index finger tip is landmark 8
    const indexTip = landmarks[8]
    // Middle finger tip is landmark 12
    const middleTip = landmarks[12]
    // Ring finger tip is landmark 16
    const ringTip = landmarks[16]
    // Pinky tip is landmark 20
    const pinkyTip = landmarks[20]
    // Palm base is landmark 0
    const palmBase = landmarks[0]
    // Wrist is landmark 0
    const wrist = landmarks[0]

    // Detect thumbs up
    if (
      thumbTip.y < wrist.y &&
      indexTip.y > thumbTip.y &&
      middleTip.y > thumbTip.y &&
      ringTip.y > thumbTip.y &&
      pinkyTip.y > thumbTip.y
    ) {
      this.processGesture("thumbsUp")
      return
    }

    // Detect thumbs down
    if (
      thumbTip.y > wrist.y &&
      indexTip.y < thumbTip.y &&
      middleTip.y < thumbTip.y &&
      ringTip.y < thumbTip.y &&
      pinkyTip.y < thumbTip.y
    ) {
      this.processGesture("thumbsDown")
      return
    }

    // Detect peace sign
    if (indexTip.y < wrist.y && middleTip.y < wrist.y && ringTip.y > middleTip.y && pinkyTip.y > middleTip.y) {
      this.processGesture("peace")
      return
    }

    // Detect open hand
    if (indexTip.y < palmBase.y && middleTip.y < palmBase.y && ringTip.y < palmBase.y && pinkyTip.y < palmBase.y) {
      this.processGesture("openHand")
      return
    }

    // Detect closed fist
    if (
      indexTip.y > palmBase.y - 0.05 &&
      middleTip.y > palmBase.y - 0.05 &&
      ringTip.y > palmBase.y - 0.05 &&
      pinkyTip.y > palmBase.y - 0.05
    ) {
      this.processGesture("closedFist")
      return
    }

    // Detect wave (simplified - just check if hand is moving horizontally)
    const horizontalMovement = this.lastHandX ? Math.abs(this.lastHandX - wrist.x) : 0
    if (horizontalMovement > 0.05) {
      this.processGesture("wave")
      return
    }

    // Store last hand position for movement detection
    this.lastHandX = wrist.x
  }

  processGesture(gesture) {
    // Avoid processing the same gesture repeatedly
    if (this.lastGesture === gesture) return

    if (this.gestureTimeout) {
      clearTimeout(this.gestureTimeout)
    }

    this.lastGesture = gesture
    this.respondToGesture(gesture)

    // Reset to neutral after 3 seconds
    this.gestureTimeout = setTimeout(() => {
      this.lastGesture = null
      this.respondToGesture("neutral")
    }, 3000)
  }

  respondToGesture(gesture) {
    const responses = this.responses[gesture] || this.responses.neutral
    const response = responses[Math.floor(Math.random() * responses.length)]

    // Animate response
    this.animateResponse(response, gesture)

    // Change background based on gesture
    this.updateBackground(gesture)
  }

  animateResponse(response, gesture) {
    this.responseElement.style.transform = "scale(0.5)"
    this.responseElement.style.opacity = "0"

    setTimeout(() => {
      this.responseElement.textContent = response
      this.responseElement.style.transform = "scale(1.2)"
      this.responseElement.style.opacity = "1"

      setTimeout(() => {
        this.responseElement.style.transform = "scale(1)"
      }, 200)
    }, 150)

    // Add burst effect
    this.addBurstEffect()
  }

  updateBackground(gesture) {
    this.aiResponse.className = "ai-response"

    switch (gesture) {
      case "wave":
        this.aiResponse.classList.add("wave-animation")
        break
      case "thumbsUp":
        this.aiResponse.style.background = "linear-gradient(45deg, #4CAF50, #8BC34A)"
        break
      case "thumbsDown":
        this.aiResponse.style.background = "linear-gradient(45deg, #f44336, #e91e63)"
        break
      case "openHand":
        this.aiResponse.classList.add("thinking-animation")
        break
      case "closedFist":
        this.aiResponse.style.background = "linear-gradient(45deg, #FF5722, #FF9800)"
        break
      case "peace":
        this.aiResponse.style.background = "linear-gradient(45deg, #9C27B0, #3F51B5)"
        break
      default:
        this.aiResponse.style.background = "rgba(255,255,255,0.95)"
    }
  }

  addBurstEffect() {
    const burst = document.createElement("div")
    burst.className = "color-burst"
    this.aiResponse.appendChild(burst)

    setTimeout(() => {
      burst.remove()
    }, 500)
  }
}

// Initialize the assistant when the page is loaded
document.addEventListener("DOMContentLoaded", () => {
  const assistant = new VisualAIAssistant()
})
