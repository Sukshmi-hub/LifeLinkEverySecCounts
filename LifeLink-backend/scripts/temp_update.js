const fs = require('fs');
const path = require('path');

const filePath = 'c:\\SukshmiPandey\\LifeLinkEverySecCounts\\LifeLink-EverySecCounts\\src\\components\\hospital\\HospitalDashboardOverview.jsx';

let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the tribute display section using regex
const regex1 = /\{\/\* Hospital tributes list \*\/\}[\s\S]*?<div className="rounded-2xl border bg-card p-6 hover:shadow-lg transition">/;
const replacement1 = `{/* Hospital tributes list */}
          <div className="mt-8">
            {hospitalTributes && hospitalTributes.length > 0 ? (
              <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Recent Tributes</h3>
                <div className="space-y-4">
                  {hospitalTributes.map((t) => (
                    <div key={t._id || t.id} className="p-4 border rounded-lg hover:bg-muted/30 transition">`;

const regex2 = /<div key=\{t\._id \|\| t\.id\} className="rounded-2xl border bg-card p-6 hover:shadow-lg transition">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;
const replacement2 = `<div key={t._id || t.id} className="p-4 border rounded-lg hover:bg-muted/30 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{t.donorName}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{t.location}</p>
                        </div>
                        <div className="text-right ml-4">
                          {t.isPublic && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium mb-2">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg>
                              Published
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground italic mt-2">"{t.aboutDonor}"</p>
                      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                          {t.donationDate ? new Date(t.donationDate).toLocaleDateString('en-IN') : new Date(t.createdAt || Date.now()).toLocaleDateString('en-IN')}
                        </span>
                        <span className="font-medium text-foreground">{t.donationType}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p>No tributes submitted yet</p>
                <p className="text-xs mt-1">Click "Submit a Tribute" to create one</p>
              </div>
            )}
          </div>`;

const updated = content.replace(regex1, replacement1).replace(regex2, replacement2);

if (updated !== content) {
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('File updated successfully');
} else {
  console.log('No changes made - pattern not found or already updated');
 }