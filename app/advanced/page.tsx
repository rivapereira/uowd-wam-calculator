"use client"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Target, TrendingUp, Calendar, Calculator, BookOpen, Award } from "lucide-react"
import Link from "next/link"

interface Subject {
  id: string
  code: string
  creditPoints: string
  mark: string
}

interface Semester {
  id: string
  name: string
  subjects: Subject[]
  createdAt: Date
  order: number
  isEditingName: boolean
}

interface PredictionSubject {
  id: string
  code: string
  creditPoints: string
  targetMark: string
}

const DEFAULT_GRADING_SYSTEM = {
  HD: 4,
  D: 3.7,
  C: 3.3,
  P: 2,
  TF: 0,
  F: 0,
}

export default function AdvancedFeatures() {
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [gradingSystem, setGradingSystem] = useState(DEFAULT_GRADING_SYSTEM)
  const [theme, setTheme] = useState("light")

  // Grade Prediction State
  const [targetWAM, setTargetWAM] = useState("")
  const [predictionSubjects, setPredictionSubjects] = useState<PredictionSubject[]>([])
  const [predictionResult, setPredictionResult] = useState<string | null>(null)

  // Course Planning State
  const [totalCreditsRequired, setTotalCreditsRequired] = useState("144")
  const [targetGraduationSemester, setTargetGraduationSemester] = useState("")

  const isDark = theme === "dark"

  // Load data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem("wam-calculator-data")
    const savedTheme = localStorage.getItem("wam-calculator-theme")
    const savedGradingSystem = localStorage.getItem("wam-calculator-grading-system")

    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData)
        setSemesters(
          parsedData.map((semester: any) => ({
            ...semester,
            createdAt: new Date(semester.createdAt),
            isEditingName: false,
          })),
        )
      } catch (e) {
        console.error("Failed to load saved data:", e)
      }
    }

    if (savedTheme) {
      setTheme(savedTheme)
    }

    if (savedGradingSystem) {
      try {
        setGradingSystem(JSON.parse(savedGradingSystem))
      } catch (e) {
        console.error("Failed to load saved grading system:", e)
      }
    }
  }, [])

  // Calculate current statistics
  const calculateCurrentWAM = useCallback(() => {
    let totalCreditPoints = 0
    let totalWeightedMarks = 0

    semesters.forEach((semester) => {
      semester.subjects.forEach((subject) => {
        const creditPoints = Number.parseFloat(subject.creditPoints)
        const mark = Number.parseFloat(subject.mark)

        if (!isNaN(creditPoints) && !isNaN(mark)) {
          totalCreditPoints += creditPoints
          totalWeightedMarks += creditPoints * mark
        }
      })
    })

    return totalCreditPoints > 0 ? totalWeightedMarks / totalCreditPoints : 0
  }, [semesters])

  const getCurrentCredits = useCallback(() => {
    let totalCredits = 0
    semesters.forEach((semester) => {
      semester.subjects.forEach((subject) => {
        const creditPoints = Number.parseFloat(subject.creditPoints)
        const mark = Number.parseFloat(subject.mark)
        if (!isNaN(creditPoints) && !isNaN(mark) && mark >= 50) {
          totalCredits += creditPoints
        }
      })
    })
    return totalCredits
  }, [semesters])

  // Grade Prediction Logic
  const addPredictionSubject = () => {
    setPredictionSubjects((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 15),
        code: "",
        creditPoints: "",
        targetMark: "",
      },
    ])
  }

  const updatePredictionSubject = (id: string, field: keyof PredictionSubject, value: string) => {
    setPredictionSubjects((prev) =>
      prev.map((subject) => (subject.id === id ? { ...subject, [field]: value } : subject)),
    )
  }

  const removePredictionSubject = (id: string) => {
    setPredictionSubjects((prev) => prev.filter((subject) => subject.id !== id))
  }

  const calculateRequiredMarks = () => {
    const currentWAM = calculateCurrentWAM()
    const currentCredits = getCurrentCredits()
    const target = Number.parseFloat(targetWAM)

    if (isNaN(target) || predictionSubjects.length === 0) {
      setPredictionResult("Please enter a target WAM and add subjects.")
      return
    }

    let totalNewCredits = 0
    const totalCurrentWeightedMarks = currentWAM * currentCredits

    predictionSubjects.forEach((subject) => {
      const credits = Number.parseFloat(subject.creditPoints)
      if (!isNaN(credits)) {
        totalNewCredits += credits
      }
    })

    if (totalNewCredits === 0) {
      setPredictionResult("Please enter valid credit points for your subjects.")
      return
    }

    const totalCreditsAfter = currentCredits + totalNewCredits
    const requiredTotalWeightedMarks = target * totalCreditsAfter
    const requiredNewWeightedMarks = requiredTotalWeightedMarks - totalCurrentWeightedMarks
    const averageRequiredMark = requiredNewWeightedMarks / totalNewCredits

    if (averageRequiredMark > 100) {
      setPredictionResult(
        `Target WAM of ${target} is not achievable. You would need an average of ${averageRequiredMark.toFixed(2)}% across all new subjects.`,
      )
    } else if (averageRequiredMark < 0) {
      setPredictionResult(
        `Great news! Your current WAM is already above your target. You can score as low as ${Math.max(0, averageRequiredMark).toFixed(2)}% average and still meet your goal.`,
      )
    } else {
      setPredictionResult(
        `To achieve a WAM of ${target}, you need an average of ${averageRequiredMark.toFixed(2)}% across your ${predictionSubjects.length} upcoming subjects (${totalNewCredits} credits total).`,
      )
    }
  }

  // Progress Tracking
  const getGradeDistribution = () => {
    const distribution = { HD: 0, D: 0, C: 0, P: 0, TF: 0, F: 0 }
    let total = 0

    semesters.forEach((semester) => {
      semester.subjects.forEach((subject) => {
        const mark = Number.parseFloat(subject.mark)
        if (!isNaN(mark) && subject.code.trim()) {
          total++
          if (mark >= 85) distribution.HD++
          else if (mark >= 75) distribution.D++
          else if (mark >= 65) distribution.C++
          else if (mark >= 50) distribution.P++
          else if (mark === 49) distribution.TF++
          else distribution.F++
        }
      })
    })

    return { distribution, total }
  }

  const getSemesterTrend = () => {
    return semesters.map((semester) => {
      let totalCreditPoints = 0
      let totalWeightedMarks = 0

      semester.subjects.forEach((subject) => {
        const creditPoints = Number.parseFloat(subject.creditPoints)
        const mark = Number.parseFloat(subject.mark)

        if (!isNaN(creditPoints) && !isNaN(mark)) {
          totalCreditPoints += creditPoints
          totalWeightedMarks += creditPoints * mark
        }
      })

      return {
        name: semester.name,
        wam: totalCreditPoints > 0 ? totalWeightedMarks / totalCreditPoints : 0,
      }
    })
  }

  const currentWAM = calculateCurrentWAM()
  const currentCredits = getCurrentCredits()
  const totalRequired = Number.parseInt(totalCreditsRequired) || 144
  const progressPercentage = (currentCredits / totalRequired) * 100
  const { distribution, total } = getGradeDistribution()
  const semesterTrend = getSemesterTrend()

  return (
    <div
      className={`min-h-screen p-4 transition-all duration-300 ${
        isDark
          ? "dark bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800"
          : "bg-gradient-to-br from-blue-50 via-white to-indigo-50"
      }`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Card
          className={`mb-8 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white/80 border-blue-200"} backdrop-blur-sm`}
        >
          <CardHeader>
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button
                  variant="outline"
                  size="sm"
                  className={`${isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Calculator
                </Button>
              </Link>
              <div>
                <CardTitle className={`text-3xl font-bold ${isDark ? "text-cyan-400" : "text-blue-700"}`}>
                  Advanced Features
                </CardTitle>
                <p className={`${isDark ? "text-slate-300" : "text-gray-600"} mt-2`}>
                  Grade prediction, progress tracking, and course planning tools
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Current Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card
            className={`${isDark ? "bg-slate-800/40 border-slate-700" : "bg-white/90 border-gray-200"} backdrop-blur-sm`}
          >
            <CardContent className="p-6 text-center">
              <div className={`text-3xl font-bold ${isDark ? "text-cyan-300" : "text-blue-600"} mb-2`}>
                {currentWAM.toFixed(2)}
              </div>
              <p className={`${isDark ? "text-slate-300" : "text-gray-600"}`}>Current WAM</p>
            </CardContent>
          </Card>

          <Card
            className={`${isDark ? "bg-slate-800/40 border-slate-700" : "bg-white/90 border-gray-200"} backdrop-blur-sm`}
          >
            <CardContent className="p-6 text-center">
              <div className={`text-3xl font-bold ${isDark ? "text-cyan-300" : "text-blue-600"} mb-2`}>
                {currentCredits}
              </div>
              <p className={`${isDark ? "text-slate-300" : "text-gray-600"}`}>Credits Completed</p>
            </CardContent>
          </Card>

          <Card
            className={`${isDark ? "bg-slate-800/40 border-slate-700" : "bg-white/90 border-gray-200"} backdrop-blur-sm`}
          >
            <CardContent className="p-6 text-center">
              <div
                className={`text-3xl font-bold ${currentWAM >= 75 ? (isDark ? "text-emerald-400" : "text-emerald-600") : isDark ? "text-orange-400" : "text-orange-600"} mb-2`}
              >
                {currentWAM >= 75 ? "Yes" : "No"}
              </div>
              <p className={`${isDark ? "text-slate-300" : "text-gray-600"}`}>Distinction Eligible</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="prediction" className="space-y-6">
          <TabsList
            className={`grid w-full grid-cols-3 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}
          >
            <TabsTrigger
              value="prediction"
              className={`${isDark ? "data-[state=active]:bg-slate-700" : "data-[state=active]:bg-blue-50"}`}
            >
              <Target className="w-4 h-4 mr-2" />
              Grade Prediction
            </TabsTrigger>
            <TabsTrigger
              value="progress"
              className={`${isDark ? "data-[state=active]:bg-slate-700" : "data-[state=active]:bg-blue-50"}`}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Progress Tracking
            </TabsTrigger>
            <TabsTrigger
              value="planning"
              className={`${isDark ? "data-[state=active]:bg-slate-700" : "data-[state=active]:bg-blue-50"}`}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Course Planning
            </TabsTrigger>
          </TabsList>

          {/* Grade Prediction Tab */}
          <TabsContent value="prediction">
            <Card
              className={`${isDark ? "bg-slate-800/40 border-slate-700" : "bg-white/90 border-gray-200"} backdrop-blur-sm`}
            >
              <CardHeader>
                <CardTitle className={`${isDark ? "text-slate-100" : "text-gray-800"} flex items-center gap-2`}>
                  <Calculator className="w-5 h-5" />
                  Grade Prediction Tool
                </CardTitle>
                <p className={`${isDark ? "text-slate-300" : "text-gray-600"}`}>
                  Calculate what marks you need in upcoming subjects to achieve your target WAM
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? "text-slate-200" : "text-gray-700"} mb-2`}>
                      Target WAM
                    </label>
                    <Input
                      type="number"
                      value={targetWAM}
                      onChange={(e) => setTargetWAM(e.target.value)}
                      placeholder="e.g., 75"
                      min="0"
                      max="100"
                      step="0.1"
                      className={`${isDark ? "bg-slate-700 border-slate-600 text-slate-100" : "bg-white border-gray-300"}`}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={addPredictionSubject}
                      className={`${isDark ? "bg-cyan-600 hover:bg-cyan-700" : "bg-blue-600 hover:bg-blue-700"} text-white`}
                    >
                      Add Subject
                    </Button>
                  </div>
                </div>

                {predictionSubjects.length > 0 && (
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold ${isDark ? "text-slate-200" : "text-gray-800"}`}>
                      Upcoming Subjects
                    </h3>
                    {predictionSubjects.map((subject) => (
                      <div key={subject.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <Input
                          placeholder="Subject Code"
                          value={subject.code}
                          onChange={(e) => updatePredictionSubject(subject.id, "code", e.target.value)}
                          className={`${isDark ? "bg-slate-700 border-slate-600 text-slate-100" : "bg-white border-gray-300"}`}
                        />
                        <Input
                          type="number"
                          placeholder="Credit Points"
                          value={subject.creditPoints}
                          onChange={(e) => updatePredictionSubject(subject.id, "creditPoints", e.target.value)}
                          min="1"
                          max="99"
                          className={`${isDark ? "bg-slate-700 border-slate-600 text-slate-100" : "bg-white border-gray-300"}`}
                        />
                        <Input
                          type="number"
                          placeholder="Expected Mark (optional)"
                          value={subject.targetMark}
                          onChange={(e) => updatePredictionSubject(subject.id, "targetMark", e.target.value)}
                          min="0"
                          max="100"
                          className={`${isDark ? "bg-slate-700 border-slate-600 text-slate-100" : "bg-white border-gray-300"}`}
                        />
                        <Button variant="destructive" size="sm" onClick={() => removePredictionSubject(subject.id)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={calculateRequiredMarks}
                    disabled={!targetWAM || predictionSubjects.length === 0}
                    className={`${isDark ? "bg-emerald-600 hover:bg-emerald-700" : "bg-green-600 hover:bg-green-700"} text-white`}
                  >
                    Calculate Required Marks
                  </Button>
                </div>

                {predictionResult && (
                  <Alert className={`${isDark ? "bg-slate-700/50 border-slate-600" : "bg-blue-50 border-blue-200"}`}>
                    <AlertDescription className={`${isDark ? "text-slate-200" : "text-blue-800"}`}>
                      {predictionResult}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tracking Tab */}
          <TabsContent value="progress">
            <div className="space-y-6">
              {/* Grade Distribution */}
              <Card
                className={`${isDark ? "bg-slate-800/40 border-slate-700" : "bg-white/90 border-gray-200"} backdrop-blur-sm`}
              >
                <CardHeader>
                  <CardTitle className={`${isDark ? "text-slate-100" : "text-gray-800"} flex items-center gap-2`}>
                    <Award className="w-5 h-5" />
                    Grade Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    {Object.entries(distribution).map(([grade, count]) => {
                      const percentage = total > 0 ? (count / total) * 100 : 0
                      const getGradeColor = (grade: string) => {
                        switch (grade) {
                          case "HD":
                            return isDark ? "text-emerald-400" : "text-emerald-600"
                          case "D":
                            return isDark ? "text-lime-400" : "text-lime-600"
                          case "C":
                            return isDark ? "text-blue-400" : "text-blue-600"
                          case "P":
                            return isDark ? "text-indigo-400" : "text-indigo-600"
                          case "TF":
                            return isDark ? "text-orange-400" : "text-orange-600"
                          case "F":
                            return isDark ? "text-red-400" : "text-red-600"
                          default:
                            return isDark ? "text-slate-400" : "text-gray-600"
                        }
                      }

                      return (
                        <div key={grade} className="text-center">
                          <div className={`text-2xl font-bold ${getGradeColor(grade)}`}>{count}</div>
                          <div className={`text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>{grade}</div>
                          <div className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            {percentage.toFixed(1)}%
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Semester Trend */}
              <Card
                className={`${isDark ? "bg-slate-800/40 border-slate-700" : "bg-white/90 border-gray-200"} backdrop-blur-sm`}
              >
                <CardHeader>
                  <CardTitle className={`${isDark ? "text-slate-100" : "text-gray-800"} flex items-center gap-2`}>
                    <TrendingUp className="w-5 h-5" />
                    Semester Performance Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {semesterTrend.map((semester, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className={`font-medium ${isDark ? "text-slate-200" : "text-gray-800"}`}>
                          {semester.name}
                        </div>
                        <div className="flex items-center gap-4">
                          <div
                            className={`text-lg font-bold ${semester.wam >= 75 ? (isDark ? "text-emerald-400" : "text-emerald-600") : isDark ? "text-slate-300" : "text-gray-700"}`}
                          >
                            {semester.wam.toFixed(2)}
                          </div>
                          <Progress value={Math.min(semester.wam, 100)} className="w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Course Planning Tab */}
          <TabsContent value="planning">
            <Card
              className={`${isDark ? "bg-slate-800/40 border-slate-700" : "bg-white/90 border-gray-200"} backdrop-blur-sm`}
            >
              <CardHeader>
                <CardTitle className={`${isDark ? "text-slate-100" : "text-gray-800"} flex items-center gap-2`}>
                  <BookOpen className="w-5 h-5" />
                  Course Planning
                </CardTitle>
                <p className={`${isDark ? "text-slate-300" : "text-gray-600"}`}>
                  Track your progress towards graduation requirements
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? "text-slate-200" : "text-gray-700"} mb-2`}>
                      Total Credits Required for Graduation
                    </label>
                    <Input
                      type="number"
                      value={totalCreditsRequired}
                      onChange={(e) => setTotalCreditsRequired(e.target.value)}
                      placeholder="e.g., 144"
                      min="1"
                      className={`${isDark ? "bg-slate-700 border-slate-600 text-slate-100" : "bg-white border-gray-300"}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? "text-slate-200" : "text-gray-700"} mb-2`}>
                      Target Graduation Semester
                    </label>
                    <Input
                      value={targetGraduationSemester}
                      onChange={(e) => setTargetGraduationSemester(e.target.value)}
                      placeholder="e.g., Spring 2025"
                      className={`${isDark ? "bg-slate-700 border-slate-600 text-slate-100" : "bg-white border-gray-300"}`}
                    />
                  </div>
                </div>

                {/* Progress Overview */}
                <div className="space-y-4">
                  <h3 className={`text-lg font-semibold ${isDark ? "text-slate-200" : "text-gray-800"}`}>
                    Graduation Progress
                  </h3>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`${isDark ? "text-slate-300" : "text-gray-600"}`}>Credits Completed</span>
                      <span className={`font-bold ${isDark ? "text-slate-200" : "text-gray-800"}`}>
                        {currentCredits} / {totalRequired}
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="w-full" />
                    <div className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      {progressPercentage.toFixed(1)}% Complete
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className={`p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-blue-50"}`}>
                      <div className={`text-2xl font-bold ${isDark ? "text-cyan-300" : "text-blue-600"}`}>
                        {totalRequired - currentCredits}
                      </div>
                      <div className={`text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>Credits Remaining</div>
                    </div>

                    <div className={`p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-green-50"}`}>
                      <div className={`text-2xl font-bold ${isDark ? "text-emerald-300" : "text-green-600"}`}>
                        {Math.ceil((totalRequired - currentCredits) / 24)}
                      </div>
                      <div className={`text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                        Semesters Left (24 credits/sem)
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-purple-50"}`}>
                      <div
                        className={`text-2xl font-bold ${currentWAM >= 75 ? (isDark ? "text-emerald-300" : "text-green-600") : isDark ? "text-orange-300" : "text-orange-600"}`}
                      >
                        {currentWAM >= 75 ? "On Track" : "Needs Work"}
                      </div>
                      <div className={`text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>Distinction Status</div>
                    </div>
                  </div>
                </div>

                {targetGraduationSemester && (
                  <Alert className={`${isDark ? "bg-slate-700/50 border-slate-600" : "bg-blue-50 border-blue-200"}`}>
                    <AlertDescription className={`${isDark ? "text-slate-200" : "text-blue-800"}`}>
                      <strong>Planning for {targetGraduationSemester}:</strong> You need{" "}
                      {totalRequired - currentCredits} more credits. At 24 credits per semester, you'll need
                      approximately {Math.ceil((totalRequired - currentCredits) / 24)} more semesters.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
