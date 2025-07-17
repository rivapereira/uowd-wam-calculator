"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Plus,
  Trash2,
  Settings,
  Info,
  Download,
  Upload,
  Printer,
  Sun,
  Moon,
  Menu,
  X,
  Edit,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import type { HTMLButtonElement } from "react"

// Helper function to generate a unique ID
const generateUniqueId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

// Default grading system values
const DEFAULT_GRADING_SYSTEM = {
  HD: 4,
  D: 3.7,
  C: 3.3,
  P: 2,
  TF: 0,
  F: 0,
}

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

export default function WAMCalculator() {
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [theme, setTheme] = useState("light")
  const [gradingSystem, setGradingSystem] = useState(DEFAULT_GRADING_SYSTEM)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [showConfirmClearModal, setShowConfirmClearModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)

  // Theme classes
  const isDark = theme === "dark"

  // Load data from localStorage on mount
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

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("wam-calculator-data", JSON.stringify(semesters))
  }, [semesters])

  useEffect(() => {
    localStorage.setItem("wam-calculator-theme", theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem("wam-calculator-grading-system", JSON.stringify(gradingSystem))
  }, [gradingSystem])

  // Auto-dismiss error messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Function to get the grade based on the mark
  const getGradeFromMark = useCallback((mark: string) => {
    const numericMark = Number.parseFloat(mark)
    if (isNaN(numericMark)) return ""
    if (numericMark >= 85) return "HD"
    if (numericMark >= 75) return "D"
    if (numericMark >= 65) return "C"
    if (numericMark >= 50) return "P"
    if (numericMark === 49) return "TF"
    if (numericMark >= 0 && numericMark < 49) return "F"
    return ""
  }, [])

  // Calculate WAM for a given set of subjects
  const calculateWAM = useCallback((subjects: Subject[]) => {
    let totalCreditPoints = 0
    let totalWeightedMarks = 0

    subjects.forEach((subject) => {
      const creditPoints = Number.parseFloat(subject.creditPoints)
      const mark = Number.parseFloat(subject.mark)

      if (!isNaN(creditPoints) && !isNaN(mark)) {
        totalCreditPoints += creditPoints
        totalWeightedMarks += creditPoints * mark
      }
    })

    return totalCreditPoints > 0 ? (totalWeightedMarks / totalCreditPoints).toFixed(2) : "0.00"
  }, [])

  // Calculate SGPA for a given set of subjects
  const calculateSGPA = useCallback(
    (subjects: Subject[]) => {
      let totalCreditPoints = 0
      let totalWeightedGradePoints = 0

      subjects.forEach((subject) => {
        const creditPoints = Number.parseFloat(subject.creditPoints)
        const mark = Number.parseFloat(subject.mark)

        if (!isNaN(creditPoints) && !isNaN(mark)) {
          const grade = getGradeFromMark(mark)
          const gradePoint = gradingSystem[grade as keyof typeof gradingSystem]

          if (gradePoint !== undefined) {
            totalCreditPoints += creditPoints
            totalWeightedGradePoints += creditPoints * gradePoint
          }
        }
      })
      return totalCreditPoints > 0 ? (totalWeightedGradePoints / totalCreditPoints).toFixed(2) : "0.00"
    },
    [gradingSystem, getGradeFromMark],
  )

  // Calculate CGPA
  const calculateCGPA = useCallback(() => {
    let overallTotalCreditPoints = 0
    let overallTotalWeightedGradePoints = 0

    semesters.forEach((semester) => {
      semester.subjects.forEach((subject) => {
        const creditPoints = Number.parseFloat(subject.creditPoints)
        const mark = Number.parseFloat(subject.mark)

        if (!isNaN(creditPoints) && mark >= 0 && mark <= 100 && subject.code.trim()) {
          const grade = getGradeFromMark(mark)
          const gradePoint = gradingSystem[grade as keyof typeof gradingSystem]

          if (gradePoint !== undefined) {
            overallTotalCreditPoints += creditPoints
            overallTotalWeightedGradePoints += creditPoints * gradePoint
          }
        }
      })
    })
    return overallTotalCreditPoints > 0
      ? (overallTotalWeightedGradePoints / overallTotalCreditPoints).toFixed(2)
      : "0.00"
  }, [semesters, gradingSystem, getGradeFromMark])

  // Calculate overall WAM
  const calculateOverallWAM = useCallback(() => {
    let allSubjects: Subject[] = []
    semesters.forEach((semester) => {
      allSubjects = allSubjects.concat(semester.subjects)
    })
    return calculateWAM(allSubjects)
  }, [semesters, calculateWAM])

  // Validation functions
  const validateCreditPoints = (value: string): boolean => {
    const num = Number.parseInt(value, 10)
    return !isNaN(num) && num >= 1 && num <= 99 && value.length <= 2
  }

  const validateMark = (value: string): boolean => {
    const num = Number.parseFloat(value)
    return !isNaN(num) && num >= 0 && num <= 100
  }

  // Add a new semester
  const addSemester = () => {
    const maxOrder = semesters.reduce((max, s) => Math.max(max, s.order || 0), -1)
    const newSemester: Semester = {
      id: generateUniqueId(),
      name: `Semester ${semesters.length + 1}`,
      subjects: [],
      createdAt: new Date(),
      order: maxOrder + 1,
      isEditingName: false,
    }
    setSemesters((prev) => [...prev, newSemester])
  }

  // Delete a semester
  const deleteSemester = (semesterId: string) => {
    setSemesters((prev) => prev.filter((s) => s.id !== semesterId))
  }

  // Add a subject to a semester
  const addSubject = (semesterId: string) => {
    setSemesters((prev) =>
      prev.map((semester) => {
        if (semester.id === semesterId) {
          if (semester.subjects.length >= 8) {
            setError("Maximum 8 subjects per semester.")
            return semester
          }
          return {
            ...semester,
            subjects: [
              ...semester.subjects,
              {
                id: generateUniqueId(),
                code: "",
                creditPoints: "",
                mark: "",
              },
            ],
          }
        }
        return semester
      }),
    )
  }

  // Handle subject input changes with enhanced validation
  const handleSubjectChange = (semesterId: string, subjectId: string, field: keyof Subject, value: string) => {
    setSemesters((prev) =>
      prev.map((semester) => {
        if (semester.id === semesterId) {
          return {
            ...semester,
            subjects: semester.subjects.map((subject) => {
              if (subject.id === subjectId) {
                let processedValue = value

                if (field === "code") {
                  processedValue = value.toUpperCase().slice(0, 10) // Limit to 10 characters
                } else if (field === "creditPoints") {
                  // Only allow digits, max 2 digits, max value 99
                  processedValue = value.replace(/[^0-9]/g, "").slice(0, 2)
                  const numValue = Number.parseInt(processedValue, 10)
                  if (!isNaN(numValue) && numValue > 99) {
                    processedValue = "99"
                  }
                } else if (field === "mark") {
                  // Allow digits and one decimal point, max value 100
                  processedValue = value.replace(/[^0-9.]/g, "")
                  const parts = processedValue.split(".")
                  if (parts.length > 2) {
                    processedValue = parts[0] + "." + parts[1]
                  }
                  if (parts[1] && parts[1].length > 2) {
                    processedValue = parts[0] + "." + parts[1].slice(0, 2)
                  }
                  const numValue = Number.parseFloat(processedValue)
                  if (!isNaN(numValue) && numValue > 100) {
                    processedValue = "100"
                  }
                }

                return { ...subject, [field]: processedValue }
              }
              return subject
            }),
          }
        }
        return semester
      }),
    )
  }

  // Delete a subject
  const deleteSubject = (semesterId: string, subjectId: string) => {
    setSemesters((prev) =>
      prev.map((semester) => {
        if (semester.id === semesterId) {
          return {
            ...semester,
            subjects: semester.subjects.filter((subject) => subject.id !== subjectId),
          }
        }
        return semester
      }),
    )
  }

  // Get grade color class with enhanced dark mode colors
  const getGradeColorClass = (grade: string) => {
    switch (grade) {
      case "HD":
        return "text-emerald-600 dark:text-emerald-400 font-bold"
      case "D":
        return "text-lime-600 dark:text-lime-400 font-bold"
      case "C":
        return "text-blue-600 dark:text-blue-400 font-bold"
      case "P":
        return "text-indigo-600 dark:text-indigo-400 font-bold"
      case "TF":
        return "text-orange-600 dark:text-orange-400 font-bold"
      case "F":
        return "text-red-600 dark:text-red-400 font-bold"
      case "":
        return "text-gray-400 dark:text-gray-500"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  }

  // Enhanced PDF generation function with uniform formatting
  const generatePDF = async () => {
    setIsGeneratingPDF(true)
    try {
      // Dynamically import jsPDF and jspdf-autotable
      const { jsPDF } = await import("jspdf")
      const autoTable = (await import("jspdf-autotable")).default

      const doc = new jsPDF()
      let yPos = 20 // Starting Y position
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15 // Consistent margin for text

      // Set consistent font throughout - no bold or italics, black color
      const baseFontSize = 9 // Smaller base font size for body text
      const headerFontSize = 11 // For Semester headers
      const titleFontSize = 14 // For main document title
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0) // Black color for all text

      // Main Title - Centered
      doc.setFontSize(titleFontSize)
      doc.text("UOWD Academic Record", pageWidth / 2, yPos, { align: "center" })
      yPos += 15 // Space after title

      // Overall Statistics - Left aligned
      doc.setFontSize(baseFontSize)
      doc.text(`Overall WAM: ${calculateOverallWAM()}`, margin, yPos)
      yPos += 7
      doc.text(`CGPA: ${calculateCGPA()}`, margin, yPos)
      yPos += 15 // Space before first semester

      // Process each semester
      semesters.forEach((semester) => {
        const validSubjects = semester.subjects.filter(
          (subject) =>
            subject.code.trim() &&
            subject.creditPoints &&
            validateCreditPoints(subject.creditPoints) &&
            subject.mark &&
            validateMark(subject.mark),
        )

        if (validSubjects.length === 0) {
          return // Skip semester if no valid subjects
        }

        // Check if we need a new page
        if (yPos > pageHeight - 100) {
          doc.addPage()
          yPos = 20 // Reset Y position for new page
        }

        // Semester header
        doc.setFontSize(headerFontSize)
        doc.text(semester.name, margin, yPos)
        yPos += 7

        // Semester statistics
        doc.setFontSize(baseFontSize)
        doc.text(`Semester WAM: ${calculateWAM(validSubjects)}`, margin, yPos)
        yPos += 5
        doc.text(`SGPA: ${calculateSGPA(validSubjects)}`, margin, yPos)
        yPos += 10 // Space before table

        // Subjects table with centered layout and consistent formatting
        const tableColumn = ["Subject Code", "Credit Points", "Final Mark", "Grade"]
        const tableRows = validSubjects.map((subject) => [
          subject.code.toUpperCase(),
          subject.creditPoints,
          subject.mark,
          getGradeFromMark(subject.mark),
        ])

        const colWidths = {
          0: 50, // Subject Code
          1: 30, // Credit Points
          2: 30, // Final Mark
          3: 30, // Grade
        }

        const totalTableWidth = Object.values(colWidths).reduce((sum, width) => sum + width, 0)
        const centeredLeftMargin = (pageWidth - totalTableWidth) / 2

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: yPos,
          theme: "plain", // Crucial for borderless, clean look
          styles: {
            fontSize: baseFontSize,
            cellPadding: 2, // Small padding for spaciousness
            halign: "center", // Center content in cells
            valign: "middle",
            textColor: [0, 0, 0], // Black text
            lineColor: [255, 255, 255], // White lines (effectively no lines)
            lineWidth: 0, // No lines
            font: "helvetica",
            fontStyle: "normal", // Ensure no bold/italics in body
          },
          headStyles: {
            fillColor: [255, 255, 255], // White background for header
            textColor: [0, 0, 0], // Black text for header
            fontStyle: "normal", // Ensure no bold/italics in header
            halign: "center",
            lineWidth: 0, // No lines around header cells
          },
          alternateRowStyles: {
            fillColor: [255, 255, 255], // No alternating row colors
          },
          columnStyles: colWidths,
          margin: { left: centeredLeftMargin, right: centeredLeftMargin }, // Center the table
          pageBreak: "auto", // Handle tables spanning multiple pages
          didDrawPage: (data) => {
            doc.setFontSize(baseFontSize - 1) // Slightly smaller font for footer
            doc.setTextColor(100, 100, 100) // Lighter gray color for footer

            // Page number - bottom left corner
            doc.text(
              `Page ${doc.internal.getNumberOfPages()}`,
              data.settings.margin.left,
              doc.internal.pageSize.height - 10,
            )

            // Timestamp - bottom right corner
            const now = new Date()
            const formattedDate = now
              .toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
              .replace(/\//g, "/")
            const formattedTime = now.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })
            const timestamp = `${formattedDate}, ${formattedTime}`
            doc.text(timestamp, pageWidth - data.settings.margin.right, doc.internal.pageSize.height - 10, {
              align: "right",
            })
          },
        })
        yPos = (doc as any).lastAutoTable.finalY + 10 // Update yPos for next semester
      })

      doc.save("UOWD_Academic_Record.pdf")
      setError(null)
    } catch (error) {
      console.error("PDF generation failed:", error)
      setError("Failed to generate PDF. Please try again.")
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Export data
  const exportData = () => {
    try {
      const dataToExport = semesters
        .map((semester) => ({
          ...semester,
          subjects: semester.subjects.filter(
            (subject) =>
              subject.code.trim() &&
              subject.creditPoints &&
              validateCreditPoints(subject.creditPoints) &&
              subject.mark &&
              validateMark(subject.mark),
          ),
        }))
        .filter((semester) => semester.subjects.length > 0)

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "wam_calculator_data.json"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setError(null)
    } catch (error) {
      setError("Failed to export data. Please try again.")
    }
  }

  // Import data
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)
        if (Array.isArray(importedData) && importedData.every((s) => s.name && Array.isArray(s.subjects))) {
          setSemesters(
            importedData.map((semester) => ({
              ...semester,
              createdAt: new Date(semester.createdAt),
              isEditingName: false,
            })),
          )
          setError(null)
        } else {
          setError("Invalid JSON format. Please upload a valid WAM calculator data file.")
        }
      } catch (parseError) {
        setError("Failed to import data. Invalid JSON file.")
      } finally {
        if (event.target) event.target.value = ""
      }
    }
    reader.readAsText(file)
  }

  // Clear all data
  const clearAllData = () => {
    setSemesters([])
    setShowConfirmClearModal(false)
    localStorage.removeItem("wam-calculator-data")
  }

  // Handle clicks outside controls
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        controlsRef.current &&
        !controlsRef.current.contains(event.target as Node) &&
        fabRef.current &&
        !fabRef.current.contains(event.target as Node)
      ) {
        setShowControls(false)
      }
    }

    if (showControls) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showControls])

  const overallWAM = calculateOverallWAM()
  const isDistinctionEligible = Number.parseFloat(overallWAM) >= 75

  // Calculate statistics
  const getTotalSubjectsTaken = () => {
    return semesters.reduce(
      (count, semester) => count + semester.subjects.filter((s) => s.code.trim() && s.creditPoints && s.mark).length,
      0,
    )
  }

  const getCreditsCompleted = () => {
    let completedCredits = 0
    semesters.forEach((semester) => {
      semester.subjects.forEach((subject) => {
        const mark = Number.parseFloat(subject.mark)
        const creditPoints = Number.parseFloat(subject.creditPoints)
        const grade = getGradeFromMark(subject.mark)

        if (!isNaN(creditPoints) && grade !== "TF" && grade !== "F" && subject.code.trim()) {
          completedCredits += creditPoints
        }
      })
    })
    return completedCredits
  }

  return (
    <div
      className={`min-h-screen p-4 transition-all duration-300 ${
        isDark
          ? "dark bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800"
          : "bg-gradient-to-br from-blue-50 via-white to-indigo-50"
      }`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
          </Alert>
        )}

        {/* Header Card */}
        <Card
          className={`mb-8 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white/80 border-blue-200"} backdrop-blur-sm`}
        >
          <CardHeader className="text-center">
            <CardTitle className={`text-4xl font-extrabold ${isDark ? "text-cyan-400" : "text-blue-700"} mb-2`}>
              WAM & GPA Calculator
            </CardTitle>
            <p className={`text-lg ${isDark ? "text-slate-300" : "text-gray-600"} max-w-3xl mx-auto`}>
              Track your weighted average mark (WAM), Semester GPA (SGPA), and Cumulative GPA (CGPA) across semesters.
            </p>
          </CardHeader>
        </Card>

        {/* Getting Started Section */}
        <Card
          className={`mb-8 ${isDark ? "bg-slate-800/30 border-cyan-500/30" : "bg-blue-50/80 border-blue-200"} backdrop-blur-sm`}
        >
          <CardContent className="p-6">
            <details className="cursor-pointer">
              <summary
                className={`font-bold text-xl mb-2 ${isDark ? "text-cyan-400" : "text-blue-800"} hover:text-opacity-80 transition-colors`}
              >
                Getting Started: How to Use This Calculator
              </summary>
              <div className="text-sm space-y-3 mt-4">
                <p className={isDark ? "text-slate-300" : "text-gray-700"}>
                  Welcome to your UOWD WAM & GPA Calculator! Here's a quick guide to get you started:
                </p>

                <div className="grid md:grid-cols-1 gap-6">
                  {" "}
                  {/* Changed to grid-cols-1 */}
                  <div>
                    <h3 className={`font-semibold text-base ${isDark ? "text-cyan-300" : "text-blue-700"} mb-2`}>
                      The Floating Toolbar:
                    </h3>
                    <ul
                      className={`list-disc list-inside ml-4 space-y-1 text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}
                    >
                      <li>
                        <strong>Theme Toggle</strong>: Switch between light and dark themes
                      </li>
                      <li>
                        <strong>Understanding Grades</strong>: Learn about WAM, SGPA, CGPA
                      </li>
                      <li>
                        <strong>Settings</strong>: Customize grade point values
                      </li>
                      <li>
                        <strong>Export/Import</strong>: Save or load your data as JSON
                      </li>
                      <li>
                        <strong>Print to PDF</strong>: Generate academic record PDF
                      </li>
                      <li>
                        <strong>Advanced Features</strong>: Access prediction and planning tools
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-slate-700 dark:to-slate-600">
                  <h4 className={`font-semibold ${isDark ? "text-cyan-300" : "text-blue-700"} mb-2`}>
                    How Calculations Work:
                  </h4>
                  <div className="grid md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <strong>WAM:</strong> Sum of (Credit Points × Mark) ÷ Sum of Credit Points
                    </div>
                    <div>
                      <strong>SGPA:</strong> Sum of (Credit Points × Grade Point) ÷ Sum of Credit Points
                    </div>
                    <div>
                      <strong>CGPA:</strong> Overall GPA across all semesters
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </CardContent>
        </Card>

        {/* Overall Statistics */}
        <Card
          className={`mb-8 ${isDark ? "bg-gradient-to-r from-slate-800/60 to-slate-700/60 border-cyan-500/30" : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"} backdrop-blur-sm`}
        >
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
              <div className="text-center lg:text-left">
                <h2 className={`text-3xl font-bold ${isDark ? "text-cyan-300" : "text-blue-800"} mb-2`}>
                  Overall WAM:{" "}
                  <span
                    className={`${isDistinctionEligible ? (isDark ? "text-emerald-400" : "text-emerald-600") : ""} ${isDark ? "text-cyan-200" : "text-blue-900"}`}
                  >
                    {overallWAM}
                  </span>
                  {isDistinctionEligible && (
                    <Badge
                      className={`ml-2 ${isDark ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-emerald-100 text-emerald-700 border-emerald-300"}`}
                    >
                      Distinction Eligible
                    </Badge>
                  )}
                </h2>
                <div className="flex flex-col sm:flex-row gap-4 text-lg">
                  <p className={`${isDark ? "text-slate-300" : "text-blue-700"}`}>
                    <strong>CGPA:</strong> {calculateCGPA()}
                  </p>
                  <p className={`${isDark ? "text-slate-300" : "text-blue-700"}`}>
                    <strong>Credits:</strong> {getCreditsCompleted()}
                  </p>
                  <p className={`${isDark ? "text-slate-300" : "text-blue-700"}`}>
                    <strong>Subjects:</strong> {getTotalSubjectsTaken()}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={addSemester}
                  className={`${isDark ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"} shadow-lg`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Semester
                </Button>
                <Link href="/advanced">
                  <Button
                    variant="outline"
                    className={`${isDark ? "border-cyan-500 text-cyan-400 hover:bg-cyan-500/10" : "border-blue-500 text-blue-600 hover:bg-blue-50"} shadow-lg`}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Advanced Features
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Semesters */}
        {semesters.length === 0 ? (
          <Card
            className={`mb-6 ${isDark ? "bg-slate-800/30 border-slate-700" : "bg-white/80 border-gray-200"} backdrop-blur-sm`}
          >
            <CardContent className="p-12 text-center">
              <div className={`text-6xl mb-4 ${isDark ? "text-slate-600" : "text-gray-300"}`}>📚</div>
              <p className={`text-xl ${isDark ? "text-slate-300" : "text-gray-600"} mb-4`}>No semesters added yet</p>
              <p className={`${isDark ? "text-slate-400" : "text-gray-500"} mb-6`}>
                Click "Add New Semester" to get started with tracking your academic progress!
              </p>
              <Button
                onClick={addSemester}
                size="lg"
                className={`${isDark ? "bg-cyan-600 hover:bg-cyan-700" : "bg-blue-600 hover:bg-blue-700"} text-white shadow-lg`}
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Semester
              </Button>
            </CardContent>
          </Card>
        ) : (
          semesters.map((semester) => (
            <Card
              key={semester.id}
              className={`mb-6 ${isDark ? "bg-slate-800/40 border-slate-700" : "bg-white/90 border-gray-200"} backdrop-blur-sm shadow-lg`}
            >
              <CardHeader className={`${isDark ? "bg-slate-700/30" : "bg-gray-50/80"} rounded-t-lg`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <CardTitle className={`text-2xl ${isDark ? "text-slate-100" : "text-gray-800"}`}>
                      {semester.name}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`${isDark ? "hover:bg-slate-600" : "hover:bg-gray-200"}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={`${isDark ? "bg-slate-600 text-slate-200" : "bg-gray-200 text-gray-700"} px-3 py-1`}
                    >
                      WAM: {calculateWAM(semester.subjects)}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={`${isDark ? "bg-slate-600 text-slate-200" : "bg-gray-200 text-gray-700"} px-3 py-1`}
                    >
                      SGPA: {calculateSGPA(semester.subjects)}
                    </Badge>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteSemester(semester.id)}
                      className="shadow-sm"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-4 flex justify-end">
                  <Button
                    onClick={() => addSubject(semester.id)}
                    className={`${isDark ? "bg-emerald-600 hover:bg-emerald-700" : "bg-green-600 hover:bg-green-700"} text-white shadow-sm`}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subject
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-600">
                  <table className="w-full">
                    <thead className={`${isDark ? "bg-slate-700" : "bg-gray-100"}`}>
                      <tr>
                        <th className={`text-left p-4 font-semibold ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                          Subject Code
                        </th>
                        <th className={`text-left p-4 font-semibold ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                          Credit Points
                        </th>
                        <th className={`text-left p-4 font-semibold ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                          Final Mark
                        </th>
                        <th className={`text-left p-4 font-semibold ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                          Grade
                        </th>
                        <th className={`text-left p-4 font-semibold ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {semester.subjects.map((subject, index) => {
                        const grade = getGradeFromMark(subject.mark)
                        const isValidCreditPoints = validateCreditPoints(subject.creditPoints)
                        const isValidMark = validateMark(subject.mark)

                        return (
                          <tr
                            key={subject.id}
                            className={`border-b ${isDark ? "border-slate-600 hover:bg-slate-700/30" : "border-gray-200 hover:bg-gray-50"} transition-colors`}
                          >
                            <td className="p-4">
                              <Input
                                value={subject.code}
                                onChange={(e) => handleSubjectChange(semester.id, subject.id, "code", e.target.value)}
                                placeholder="e.g., ACCY101"
                                className={`${isDark ? "bg-slate-800 border-slate-600 text-slate-100" : "bg-white border-gray-300"} focus:ring-2 ${isDark ? "focus:ring-cyan-500" : "focus:ring-blue-500"}`}
                                maxLength={10}
                              />
                            </td>
                            <td className="p-4">
                              <Input
                                type="number"
                                value={subject.creditPoints}
                                onChange={(e) =>
                                  handleSubjectChange(semester.id, subject.id, "creditPoints", e.target.value)
                                }
                                placeholder="e.g., 6"
                                min="1"
                                max="99"
                                className={`${isDark ? "bg-slate-800 border-slate-600 text-slate-100" : "bg-white border-gray-300"} focus:ring-2 ${isDark ? "focus:ring-cyan-500" : "focus:ring-blue-500"} ${
                                  subject.creditPoints && !isValidCreditPoints
                                    ? "border-red-500 dark:border-red-400"
                                    : ""
                                }`}
                              />
                            </td>
                            <td className="p-4">
                              <Input
                                type="number"
                                value={subject.mark}
                                onChange={(e) => handleSubjectChange(semester.id, subject.id, "mark", e.target.value)}
                                placeholder="e.g., 75.5"
                                min="0"
                                max="100"
                                step="0.01"
                                className={`${isDark ? "bg-slate-800 border-slate-600 text-slate-100" : "bg-white border-gray-300"} focus:ring-2 ${isDark ? "focus:ring-cyan-500" : "focus:ring-blue-500"} ${
                                  subject.mark && !isValidMark ? "border-red-500 dark:border-red-400" : ""
                                }`}
                              />
                            </td>
                            <td className="p-4">
                              <Badge
                                className={`${getGradeColorClass(grade)} bg-transparent border-0 text-lg px-2 py-1`}
                              >
                                {grade || "—"}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteSubject(semester.id, subject.id)}
                                className="shadow-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {semester.subjects.length === 0 && (
                  <div className={`text-center py-8 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    <div className="text-4xl mb-2">📝</div>
                    <p>No subjects added yet. Click "Add Subject" to start.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}

        {/* Academic Summary */}
        {semesters.length > 0 && (
          <Card
            className={`mt-10 ${isDark ? "bg-gradient-to-r from-slate-800/60 to-slate-700/60 border-cyan-500/30" : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"} backdrop-blur-sm`}
          >
            <CardHeader>
              <CardTitle className={`text-3xl text-center ${isDark ? "text-cyan-400" : "text-blue-800"}`}>
                Academic Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-lg">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${isDark ? "text-cyan-300" : "text-blue-600"}`}>
                    {getTotalSubjectsTaken()}
                  </div>
                  <p className={`${isDark ? "text-slate-300" : "text-gray-600"}`}>Total Subjects</p>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${isDark ? "text-cyan-300" : "text-blue-600"}`}>
                    {getCreditsCompleted()}
                  </div>
                  <p className={`${isDark ? "text-slate-300" : "text-gray-600"}`}>Credits Completed</p>
                </div>
                <div className="text-center">
                  <div
                    className={`text-3xl font-bold ${isDistinctionEligible ? (isDark ? "text-emerald-400" : "text-emerald-600") : isDark ? "text-cyan-300" : "text-blue-600"}`}
                  >
                    {overallWAM}
                  </div>
                  <p className={`${isDark ? "text-slate-300" : "text-gray-600"}`}>Overall WAM</p>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${isDark ? "text-cyan-300" : "text-blue-600"}`}>
                    {calculateCGPA()}
                  </div>
                  <p className={`${isDark ? "text-slate-300" : "text-gray-600"}`}>CGPA</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Credits and Disclaimer */}
        <Card
          className={`mt-8 ${isDark ? "bg-slate-800/30 border-slate-700" : "bg-gray-50/80 border-gray-200"} backdrop-blur-sm`}
        >
          <CardContent className="p-4 text-center">
            <div className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"} space-y-2`}>
              <p>
                <span className="font-semibold">Made by NegoshiiEita</span>
                <span className="mx-2">{"^_^"}</span>
                <span>{""}</span>
              </p>
              <p className="text-xs">
                This is just a project and is not affiliated with UOWD in any official way. Use at your own risk (but it
                should work fine... probably).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Floating Action Button */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-3">
          <div
            ref={controlsRef}
            className={`flex flex-col space-y-2 p-4 rounded-xl shadow-2xl ${isDark ? "bg-slate-800/95 border border-slate-600" : "bg-white/95 border border-gray-200"} backdrop-blur-md transform transition-all duration-300 ease-out
              ${showControls ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2 pointer-events-none"}`}
          >
            <Button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              size="sm"
              variant="ghost"
              className={`${isDark ? "hover:bg-slate-700 text-slate-200" : "hover:bg-gray-100 text-gray-700"} justify-start`}
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? <Moon className="w-4 h-4 mr-2" /> : <Sun className="w-4 h-4 mr-2" />}
              {theme === "light" ? "Dark Mode" : "Light Mode"}
            </Button>

            <Dialog open={showInfoModal} onOpenChange={setShowInfoModal}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`${isDark ? "hover:bg-slate-700 text-slate-200" : "hover:bg-gray-100 text-gray-700"} justify-start`}
                >
                  <Info className="w-4 h-4 mr-2" />
                  Grade Info
                </Button>
              </DialogTrigger>
              <DialogContent
                className={`max-w-3xl ${isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"}`}
              >
                <DialogHeader>
                  <DialogTitle className={`${isDark ? "text-slate-100" : "text-gray-900"}`}>
                    Understanding Your Grades at UOWD
                  </DialogTitle>
                </DialogHeader>
                <div
                  className={`space-y-4 text-sm ${isDark ? "text-slate-300" : "text-gray-700"} max-h-96 overflow-y-auto`}
                >
                  <p>
                    This calculator helps you track your academic performance at UOWD. Here are the key terms and how
                    they're calculated:
                  </p>

                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-blue-50"}`}>
                      <h3 className={`font-semibold text-lg ${isDark ? "text-cyan-300" : "text-blue-700"} mb-2`}>
                        Weighted Average Mark (WAM)
                      </h3>
                      <p className="mb-2">WAM gives more weight to subjects with higher credit points.</p>
                      <p className="font-mono text-sm bg-gray-100 dark:bg-slate-800 p-2 rounded">
                        WAM = Sum of (Subject Credit Points × Final Mark) ÷ Sum of (Subject Credit Points)
                      </p>
                    </div>

                    <div className={`p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-green-50"}`}>
                      <h3 className={`font-semibold text-lg ${isDark ? "text-emerald-300" : "text-green-700"} mb-2`}>
                        Graduating with Distinction at UOWD
                      </h3>
                      <ul className="list-disc list-inside space-y-1">
                        <li>A final WAM of 75 or more typically makes you eligible to graduate with distinction</li>
                        <li>This calculator is a guide only; final assessment is done by UOWD</li>
                        <li>Check official UOWD Coursework Rules for detailed eligibility criteria</li>
                      </ul>
                    </div>

                    <div className={`p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-purple-50"}`}>
                      <h3 className={`font-semibold text-lg ${isDark ? "text-purple-300" : "text-purple-700"} mb-2`}>
                        Grade Scale
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>HD (85-100): High Distinction</div>
                        <div>D (75-84): Distinction</div>
                        <div>C (65-74): Credit</div>
                        <div>P (50-64): Pass</div>
                        <div>TF (49): Technical Fail</div>
                        <div>F (0-48): Fail</div>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`${isDark ? "hover:bg-slate-700 text-slate-200" : "hover:bg-gray-100 text-gray-700"} justify-start`}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent className={`${isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"}`}>
                <DialogHeader>
                  <DialogTitle className={`${isDark ? "text-slate-100" : "text-gray-900"}`}>
                    Change Grading System
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {Object.entries(gradingSystem).map(([grade, value]) => (
                    <div key={grade} className="flex items-center space-x-3">
                      <label className={`w-1/4 font-semibold ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                        {grade}
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        value={value}
                        onChange={(e) =>
                          setGradingSystem((prev) => ({
                            ...prev,
                            [grade]: Number.parseFloat(e.target.value) || 0,
                          }))
                        }
                        className={`w-1/2 ${isDark ? "bg-slate-700 border-slate-600 text-slate-100" : "bg-white border-gray-300"}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setGradingSystem(DEFAULT_GRADING_SYSTEM)}
                    className={`${isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                  >
                    Reset to Default
                  </Button>
                  <Button
                    onClick={() => setShowSettingsModal(false)}
                    className={`${isDark ? "bg-cyan-600 hover:bg-cyan-700" : "bg-blue-600 hover:bg-blue-700"} text-white`}
                  >
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              size="sm"
              variant="ghost"
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              className={`${isDark ? "hover:bg-slate-700 text-slate-200" : "hover:bg-gray-100 text-gray-700"} justify-start`}
            >
              <Printer className="w-4 h-4 mr-2" />
              {isGeneratingPDF ? "Generating..." : "Print PDF"}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={exportData}
              className={`${isDark ? "hover:bg-slate-700 text-slate-200" : "hover:bg-gray-100 text-gray-700"} justify-start`}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>

            <input type="file" ref={fileInputRef} onChange={importData} accept=".json" style={{ display: "none" }} />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className={`${isDark ? "hover:bg-slate-700 text-slate-200" : "hover:bg-gray-100 text-gray-700"} justify-start`}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </Button>

            <Link href="/advanced">
              <Button
                size="sm"
                variant="ghost"
                className={`${isDark ? "hover:bg-slate-700 text-slate-200" : "hover:bg-gray-100 text-gray-700"} justify-start w-full`}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Advanced Features
              </Button>
            </Link>

            <Dialog open={showConfirmClearModal} onOpenChange={setShowConfirmClearModal}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 justify-start"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Data
                </Button>
              </DialogTrigger>
              <DialogContent className={`${isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"}`}>
                <DialogHeader>
                  <DialogTitle className={`${isDark ? "text-slate-100" : "text-gray-900"}`}>
                    Confirm Clear All Data
                  </DialogTitle>
                </DialogHeader>
                <p className={`mb-6 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Are you sure you want to delete ALL your semester and subject data? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmClearModal(false)}
                    className={`${isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={clearAllData}>
                    Clear All
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Button
            ref={fabRef}
            onClick={() => setShowControls((prev) => !prev)}
            className={`w-16 h-16 rounded-full shadow-2xl ${isDark ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"} text-white border-4 ${isDark ? "border-slate-700" : "border-white"} transition-all duration-300 hover:scale-110`}
            title={showControls ? "Close Controls" : "Open Controls"}
          >
            {showControls ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
