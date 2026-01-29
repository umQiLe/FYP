const PDFDocument = require('pdfkit');

class ReportService {

    generateReport(stats, res) {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=SessionReport_${stats.sessionId}.pdf`);

        doc.pipe(res);

        // --- Branding / Header ---
        doc.fontSize(24).fillColor('#000000').text('Session Statistics Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#666666').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        // --- Session Overview ---
        doc.moveDown(2); // Ensure spacing
        const overviewY = doc.y;

        doc.rect(50, overviewY, 495, 80).fill('#f5f5f5').stroke();
        doc.fillColor('#000000'); // Reset black

        const startY = overviewY + 15; // Start text INSIDE the box
        doc.fontSize(14).font('Helvetica-Bold').text('Session Overview', 60, startY);
        doc.fontSize(10).font('Helvetica').text(`Session ID: ${stats.sessionId}`, 60, startY + 25);
        doc.text(`Duration: ${this._calculateDuration(stats.startTime, stats.endTime)}`, 60, startY + 40);
        doc.text(`Total Users: ${stats.totalUsers}`, 300, startY + 25);
        doc.text(`Active Speakers: ${stats.activeUsers} (${stats.participationRate}%)`, 300, startY + 40);

        doc.y = overviewY + 80; // Move cursor after box

        doc.moveDown(4);

        // --- Smart Analysis (The "Algorithm") ---
        doc.fontSize(16).font('Helvetica-Bold').text('Key Insights & Analysis');
        doc.moveDown(0.5);

        const insights = this._generateInsights(stats);

        insights.forEach(insight => {
            const iy = doc.y;
            const color = insight.type === 'positive' ? '#22c55e' : (insight.type === 'negative' ? '#ef4444' : '#3b82f6');

            doc.fontSize(10).font('Helvetica'); // Measure with correct font
            const descHeight = doc.heightOfString(insight.description, { width: 440 });
            const totalHeight = Math.max(30, descHeight + 20);

            doc.rect(50, iy, 3, totalHeight).fill(color); // Dynamic Indicator strip
            doc.fillColor('#333333').fontSize(11).font('Helvetica-Bold').text(insight.title, 60, iy);
            doc.fontSize(10).font('Helvetica').fillColor('#666666').text(insight.description, 60, iy + 14, { width: 430 });

            doc.y = iy + totalHeight + 10; // Consistent spacing
        });

        doc.moveDown(2);

        // --- Student Performance Table ---
        doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold').text('Student Performance Matrix');
        doc.moveDown(1);

        // Table Headers
        const tableTop = doc.y;
        this._drawTableRow(doc, tableTop, ['Name', 'Email', 'Speaks', 'Duration', 'Score'], true);

        let y = tableTop + 25;
        stats.studentPerformance.forEach((student, i) => {
            // Background row striping
            if (i % 2 === 0) {
                doc.rect(50, y - 5, 495, 20).fill('#fafafa').stroke();
                doc.fillColor('#000000'); // reset
            }

            this._drawTableRow(doc, y, [
                student.name || 'Unknown',
                student.email || '-',
                student.speakCount.toString(),
                `${student.totalDuration}s`,
                student.engagementScore.toString()
            ]);
            y += 20;

            // New Page Check
            if (y > 750) {
                doc.addPage();
                y = 50;
                this._drawTableRow(doc, y, ['Name', 'Email', 'Speaks', 'Duration', 'Score'], true);
                y += 25;
            }
        });



        // Call System Health Section
        doc.addPage();
        this._drawSystemHealth(doc, stats);

        doc.end();
    } // End of generateReport

    _drawSystemHealth(doc, stats) {
        doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold').text('System Health Analysis');
        const headerY = doc.y;
        doc.rect(50, headerY + 5, 495, 2).fill('#f0f0f0');
        doc.y = headerY + 20;

        const techInsights = this._generateTechInsights(stats);

        const cardsY = doc.y;
        this._drawMetricCard(doc, 50, cardsY, 'Avg Network RTT', `${Math.round(this._calculateAvgLatency(stats))} ms`, parseFloat(stats.avgAudioLatency) > 150 ? 'bad' : 'good');
        this._drawMetricCard(doc, 220, cardsY, 'Max Jitter', `${stats.maxJitter} ms`, parseFloat(stats.maxJitter) > 30 ? 'bad' : 'good');
        this._drawMetricCard(doc, 390, cardsY, 'Stream Stability', this._calculateStability(stats), 'neutral');

        doc.y = cardsY + 80 + 30; // Move past cards

        doc.fontSize(14).font('Helvetica-Bold').text('Technical Observations');
        doc.moveDown(0.5);

        techInsights.forEach(insight => {
            const iy = doc.y;
            const color = insight.type === 'positive' ? '#22c55e' : (insight.type === 'negative' ? '#ef4444' : '#3b82f6');

            doc.fontSize(10).font('Helvetica');
            const descHeight = doc.heightOfString(insight.description, { width: 440 });
            const totalHeight = Math.max(30, descHeight + 20);

            doc.rect(50, iy, 3, totalHeight).fill(color);
            doc.fillColor('#333333').fontSize(11).font('Helvetica-Bold').text(insight.title, 60, iy);
            doc.fontSize(10).font('Helvetica').fillColor('#666666').text(insight.description, 60, iy + 14, { width: 430 });

            doc.y = iy + totalHeight + 10;
        });
    }

    _drawMetricCard(doc, x, y, title, value, type) {
        doc.rect(x, y, 150, 80).fill('#fafafa').stroke('#e5e5e5');
        const color = type === 'good' ? '#22c55e' : (type === 'bad' ? '#ef4444' : '#000000');
        doc.fillColor('#666666').fontSize(10).font('Helvetica').text(title, x + 15, y + 15);
        doc.fillColor(color).fontSize(20).font('Helvetica-Bold').text(value, x + 15, y + 35);
    }

    _generateTechInsights(stats) {
        const insights = [];
        const avgLat = this._calculateAvgLatency(stats);
        const maxJitter = parseFloat(stats.maxJitter);

        if (avgLat < 50) insights.push({ type: 'positive', title: 'Excellent Network', description: `Average latency was very low (${avgLat}ms), ensuring real-time response.` });
        else if (avgLat > 150) insights.push({ type: 'negative', title: 'High Latency', description: `Network lag detected (${avgLat}ms avg). This may affect PTT responsiveness.` });
        else insights.push({ type: 'neutral', title: 'Stable Network', description: `Latency is within acceptable limits (${avgLat}ms).` });

        if (maxJitter > 50) insights.push({ type: 'negative', title: 'Audio Instability', description: `High jitter (${maxJitter}ms) detected. Audio might have sounded robotic or cut out.` });
        else insights.push({ type: 'positive', title: 'Stable Audio Stream', description: `Jitter remained low (<30ms), indicating a smooth voice experience.` });

        return insights;
    }

    _calculateAvgLatency(stats) {
        return parseFloat(stats.avgAudioLatency || 0);
    }

    _calculateStability(stats) {
        const lat = this._calculateAvgLatency(stats);
        const jit = parseFloat(stats.maxJitter);
        if (lat < 100 && jit < 30) return 'High';
        if (lat < 200 && jit < 60) return 'Medium';
        return 'Low';
    }
    _drawTableRow(doc, y, columns, isHeader = false) {
        doc.fontSize(10);
        if (isHeader) doc.font('Helvetica-Bold');
        else doc.font('Helvetica');

        // Revised Layout to fit A4 (Margin 50, Width 495)
        // Name   : x=60, w=140
        // Email  : x=210, w=150
        // Speaks : x=370, w=50 (Center)
        // Time   : x=430, w=50 (Center)
        // Score  : x=490, w=50 (Center)

        doc.text(columns[0], 60, y, { width: 140, ellipsis: true });
        doc.text(columns[1], 210, y, { width: 150, ellipsis: true });
        doc.text(columns[2], 370, y, { width: 50, align: 'center' });
        doc.text(columns[3], 430, y, { width: 50, align: 'center' });
        doc.text(columns[4], 490, y, { width: 50, align: 'center' });
    }

    _calculateDuration(start, end) {
        if (!start) return '0s';
        const s = new Date(start);
        const e = end ? new Date(end) : new Date();
        const diffMs = e - s;
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        return `${mins}m ${secs}s`;
    }

    _generateInsights(stats) {
        const insights = [];

        // 1. Participation Insight
        const rate = parseFloat(stats.participationRate);
        if (rate > 60) {
            insights.push({
                type: 'positive',
                title: 'High Participation',
                description: `Great engagement! ${rate}% of users participated in the discussion.`
            });
        } else if (rate < 20) {
            insights.push({
                type: 'negative',
                title: 'Low Participation',
                description: `Only ${rate}% of users spoke. Consider prompting quiet students next time.`
            });
        } else {
            insights.push({
                type: 'neutral',
                title: 'Moderate Participation',
                description: `${rate}% of the class contributed to the session.`
            });
        }

        // 2. Dominance Insight
        if (stats.studentPerformance && stats.studentPerformance.length > 0) {
            const top = stats.studentPerformance[0];
            const totalDuration = stats.avgSpeakingDuration * stats.activeUsers; // Approximate
            const realTotal = stats.studentPerformance.reduce((acc, s) => acc + parseFloat(s.totalDuration), 0);

            if (realTotal > 0) {
                const dominance = (parseFloat(top.totalDuration) / realTotal) * 100;
                if (dominance > 40) {
                    insights.push({
                        type: 'neutral',
                        title: 'Dominant Speaker',
                        description: `${top.name} contributed ${dominance.toFixed(1)}% of the total speaking time.`
                    });
                }
            }

            // 3. Top Performer
            insights.push({
                type: 'positive',
                title: 'Top Contributor',
                description: `${top.name} achieved the highest engagement score of ${top.engagementScore}.`
            });
        }

        // 4. Ghost Insight
        if (stats.ghostUsers && stats.ghostUsers.length > 3) {
            insights.push({
                type: 'negative',
                title: 'Silent Group Detected',
                description: `${stats.ghostUsers.length} users did not speak at all.`
            });
        }

        return insights;
    }
}

module.exports = new ReportService();
